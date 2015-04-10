#!/usr/bin/env node
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

const net = require('net'),
      tls = require('tls'),
      carrier = require('carrier'),
      isUtf8 = require('is-utf8'),
      iconv = require('iconv-lite'),
      co = require('co'),
      conf = require('../../lib/conf'),
      log = require('../../lib/log'),
      courier = require('../../lib/courier').createEndPoint('connectionmanager');

let sockets = {};
let nextNetworkConnectionSlot = {};

const LAG_POLL_INTERVAL = 60 * 1000; // 60s

exports.init = function(setIdentdHandler) {
    setIdentdHandler(handleIdentConnection);
};

function handleIdentConnection(conn) {
    let timer = setTimeout(function() {
        if (conn) {
            conn.destroy();
        }
    }, 3000);

    carrier.carry(conn, function(line) {
        let ports = line.split(',');
        let localPort = parseInt(ports[0]);
        let remotePort = parseInt(ports[1]);
        let prefix = localPort + ', ' + remotePort;
        let found = false;
        let resp;

        // Indexof() is needed because conn.remoteAddress can be in ::ffff:185.30.166.35 format
        // while sockets[userId].remoteAddress is 185.30.166.
        if (!isNaN(localPort) && !isNaN(remotePort)) {
            for (let userId in sockets) {
                if (sockets[userId].localPort === localPort &&
                    sockets[userId].remotePort === remotePort &&
                    conn.remoteAddress.indexOf(sockets[userId].remoteAddress) > -1) {
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
    let network = params.network;
    let delay = 0;
    let rateLimit = conf.get('irc:networks:' + network + ':rate_limit'); // connections per minute

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
    let userId = params.userId;
    let network = params.network;
    let socketName = userId + ':' + network;

    write({ userId: userId, network: network, reportError: false }, 'QUIT :' + params.reason);

    if (sockets[socketName]) {
        sockets[socketName].end();
    }
});

// Write
courier.on('write', function(params) {
    write({ userId: params.userId, network: params.network, reportError: true }, params.line);
});

co(function*() {
    yield courier.clearInbox('ircparser');
    courier.callNoWait('ircparser', 'restarted');
    courier.start();
})();

function connect(userId, nick, network) {
    let socket;
    let port = conf.get('irc:networks:' + network + ':port');
    let host = conf.get('irc:networks:' + network + ':host');
    let options = {
        host: host,
        port: port
    };

    if (conf.get('irc:networks:' + network + ':ssl')) {
        socket = tls.connect(port, host, {});
    } else {
        socket = net.connect(options);
    }

    socket.nick = nick;
    socket.setKeepAlive(true, 2 * 60 * 1000); // 2 minutes

    function sendPing() {
        if (Date.now() - socket.last > LAG_POLL_INTERVAL) {
            // Nothing has been sent after previous round
            socket.write('PING ' + socket.ircServerName + '\r\n');
        }
    }

    socket.on('connect', function() {
        courier.callNoWait('ircparser', 'connected', { userId: userId, network: network });

        socket.pingTimer = setInterval(sendPing, LAG_POLL_INTERVAL);
    });

    let buffer = '';

    socket.on('data', function(data) {
        socket.last = Date.now();

        // IRC protocol doesn't have character set concept, we need to guess.
        // Algorithm is simple. If received binary data is valid utf8 then use
        // that. Else assume that the character set is iso-8859-15.
        data = isUtf8(data) ? data.toString() : iconv.decode(data, 'iso-8859-15');
        data = buffer + data;

        let lines = data.split(/\r\n/);
        buffer = lines.pop(); // Save the potential partial line to buffer

        lines.forEach(function(line) {
            let proceed = handlePing(socket, line);

            if (proceed) {
                courier.callNoWait(
                    'ircparser', 'data', { userId: userId, network: network, line: line });
            }
        });
    });

    socket.on('end', function() {
        handleEnd(userId, network, null);
    });

    socket.on('error', function(error) {
        handleEnd(userId, network, error);
    });

    socket.on('close', function() {
        handleEnd(userId, network, null);
    });

    sockets[userId + ':' + network] = socket;
}

function write(options, data) {
    let socket = sockets[options.userId + ':' + options.network];

    if (!socket) {
        if (options.reportError) {
            courier.callNoWait(
                'ircparser', 'noconnection', { userId: options.userId, network: options.network });
        }
        return;
    }

    if (typeof(data) === 'string') {
        data = [ data ];
    }

    for (let line of data) {
        socket.write(line + '\r\n');
    }

    socket.last = Date.now();
}

// Minimal parser to handle server sent PING command at this level
function handlePing(socket, line) {
    let parts = line.split(' ');

    if ((parts[0].charAt(0) === ':')) {
        parts.shift();
    }

    let command = parts.shift();

    if (command === 'PING') {
        socket.write('PONG :' + socket.ircServerName + '\r\n');
        return false;
    } else if (command === '004') {
        socket.ircServerName = parts[1]; // RFC 2812, reply 004
    }

    return true;
}

function handleEnd(userId, network, error) {
    let socket = sockets[userId + ':' + network];
    let reason = error ? error.code : 'connection closed by the server';

    if (!socket) {
        return; // Already handled
    }

    delete sockets[userId + ':' + network];
    clearInterval(socket.pingTimer);

    log.info(userId, 'IRC connection closed by the server or network.');

    courier.callNoWait(
        'ircparser', 'disconnected', { userId: userId, network: network, reason: reason });
}
