#!/usr/bin/env node --harmony
//
//   Copyright 2014 Ilkka Oksanen <iao@iki.fi>
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing,
//   software distributed under the License is distributed on an "AS
//   IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
//   express or implied.  See the License for the specific language
//   governing permissions and limitations under the License.
//

'use strict';

// Minimal connection manager that keeps TCP sockets alive even if
// rest of the system is restarted. Allows nondistruptive updates.

require('../../lib/init')('irc-connman');

var net = require('net'),
    carrier = require('carrier'),
    isUtf8 = require('is-utf8'),
    iconv = require('iconv-lite'),
    conf = require('../../lib/conf'),
    log = require('../../lib/log'),
    courier = require('../../lib/courier').createEndPoint('connectionmanager');

var sockets = {};
var nextNetworkConnectionSlot = {};

const IDENTD_PORT = 113;
const LAG_POLL_INTERVAL = 60 * 1000; // 60s

courier.sendNoWait('ircparser', 'restarted');

// Start IDENT server
if (conf.get('irc:identd')) {
    net.createServer(handleIdentConnection).listen(IDENTD_PORT);
}

function handleIdentConnection(conn) {
    var timer = setTimeout(function() {
        if (conn) {
            conn.destroy();
        }
    }, 3000);

    carrier.carry(conn, function(line) {
        var ports = line.split(',');
        var localPort = parseInt(ports[0]);
        var remotePort = parseInt(ports[1]);
        var prefix = localPort + ', ' + remotePort;
        var found = false;
        var resp;

        if (!isNaN(localPort) && !isNaN(remotePort)) {
            for (var userId in sockets) {
                if (sockets[userId].localPort === localPort &&
                    sockets[userId].remotePort === remotePort &&
                    sockets[userId].remoteAddress === conn.remoteAddress) {
                    found = true;
                    resp = prefix + ' : USERID : UNIX : ' + sockets[userId].nick + '\r\n';
                    break;
                }
            }

            if (!found) {
                resp = prefix + ' : ERROR : NO-USER\r\n';
            }
        }

        clearTimeout(timer);

        if (resp) {
            conn.write(resp);
        }
        conn.end();

        log.info('Ident request from ' + conn.remoteAddress + ', req: ' + line + ', resp: ' + resp);
    });
}

// Connect
courier.on('connect', function(params) {
    var rateLimit = conf.get('irc:networks:' + network + ':rate_limit'); // connections per minute
    var network = params.network;
    var delay = 0;

    if (!nextNetworkConnectionSlot[network] || nextNetworkConnectionSlot[network] < Date.now()) {
        // Rate limiting not active
        nextNetworkConnectionSlot[network] = Date.now();
    } else {
        delay = nextNetworkConnectionSlot[network] - Date.now();
    }

    setTimeout(function() {
        connect(params.userId, params.nick, network);
    }, delay);

    nextNetworkConnectionSlot[network] += Math.round(60 / rateLimit * 1000);
});

// Disconnect
courier.on('disconnect', function(params) {
    var userId = params.userId;
    var network = params.network;

    sockets[userId + ':' + network].end();
    delete sockets[userId + ':' + network];
});

// Write
courier.on('write', function(params) {
    var userId = params.userId;
    var network = params.network;
    var socket = sockets[userId + ':' + network];
    var data = params.line;

    if (!socket) {
        log.warn(userId, 'Non-existent socket');
        return;
    }

    if (typeof(data) === 'string') {
        data = [ data ];
    }

    for (var i = 0; i < data.length; i++) {
        socket.write(data[i] + '\r\n');
    }

    socket.last = Date.now();
});

courier.start();

function connect(userId, nick, network) {
    var options = {
        host: conf.get('irc:networks:' + network + ':host'),
        port: conf.get('irc:networks:' + network + ':port')
    };
    var socket = net.connect(options);

    socket.nick = nick;
    socket.setKeepAlive(true, 2 * 60 * 1000); // 2 minutes

    function sendPing() {
        if (Date.now() - socket.last > LAG_POLL_INTERVAL) {
            // Nothing has been sent after previous round
            socket.write('PING ' + socket.ircServerName + '\r\n');
        }
    }

    socket.on('connect', function() {
        courier.sendNoWait('ircparser', {
            type: 'connected',
            userId: userId,
            network: network
        });

        socket.pingTimer = setInterval(sendPing, LAG_POLL_INTERVAL);
    });

    var buffer = '';

    socket.on('data', function(data) {
        socket.last = Date.now();

        // IRC protocol doesn't have character set concept, we need to guess.
        // Algorithm is simple. If received binary data is valid utf8 then use
        // that. Else assume that the character set is iso-8859-15.
        data = isUtf8(data) ? data.toString() : iconv.decode(data, 'iso-8859-15');
        data = buffer + data;

        var lines = data.split(/\r\n/);
        buffer = lines.pop(); // Save the potential partial line to buffer

        lines.forEach(function(line) {
            var proceed = handlePing(socket, line);

            if (proceed) {
                courier.sendNoWait('ircparser', {
                    type: 'data',
                    userId: userId,
                    network: network,
                    line: line
                });
            }
        });
    });

    socket.on('end', function() {
        handleEnd(false, userId, network);
    });

    socket.on('error', function() {
        handleEnd(true, userId, network);
    });

    socket.on('close', function(hadError) {
        handleEnd(hadError, userId, network);
    });

    sockets[userId + ':' + network] = socket;
}

// Minimal parser to handle server sent PING command at this level
function handlePing(socket, line) {
    var parts = line.split(' ');

    if ((parts[0].charAt(0) === ':')) {
        parts.shift();
    }

    var command = parts.shift();

    if (command === 'PING') {
        socket.write('PONG :' + socket.ircServerName + '\r\n');
        return false;
    } else if (command === '004') {
        socket.ircServerName = parts[1]; // RFC 2812, reply 004
    }

    return true;
}

function handleEnd(hadError, userId, network) {
    var socket = sockets[userId + ':' + network];

    if (!socket) {
        // Already handled
        return;
    }

    delete sockets[userId + ':' + network];
    clearInterval(socket.pingTimer);

    log.info(userId, 'IRC connection closed by the server or network.');

    courier.sendNoWait('ircparser', {
        type: 'disconnected',
        userId: userId,
        network: network,
        reason: hadError ? 'transmission error' : 'connection closed by the server'
    });
}
