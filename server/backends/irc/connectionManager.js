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

process.title = 'mas-irc-connman';
process.umask(18); // file: rw-r--r-- directory: rwxr-xr-x

// Minimal connection manager that keeps TCP sockets alive even if
// rest of the system is restarted. Allows nondistruptive updates.

var net = require('net'),
    npid = require('npid'),
    carrier = require('carrier'),
    conf = require('../../lib/conf'),
    log = require('../../lib/log'),
    courier = require('../../lib/courier').createEndPoint('connectionmanager');

npid.create(conf.get('pid:directory') + '/' + process.title + '.pid');

log.info('Starting: ' + process.title);

var sockets = {};
const IDENTD_PORT = 113;

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

        log.info('Ident request from ' + conn.remoteAddress + ', req: ' + line +', resp: ' + resp);
    });
}

// Connect
courier.on('connect', function(params) {
    var userId = params.userId;
    var network = params.network;
    var options = {
        port: params.port,
        host: params.host
    };

    var client = net.connect(options);
    client.nick = params.nick;

    client.on('connect', function() {
        courier.sendNoWait('ircparser', {
            type: 'connected',
            userId: userId,
            network: network
        });
    });

    carrier.carry(client, function(line) {
        courier.sendNoWait('ircparser', {
            type: 'data',
            userId: userId,
            network: network,
            line: line
        });
    });

    client.on('end', function() {
        courier.sendNoWait('ircparser', 'disconnected');
    });

    sockets[userId + ':' + network] = client;
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
    var data = params.line;

    if (!sockets[userId + ':' + network]) {
        log.warn(userId, 'Non-existent socket');
        return;
    }

    if (typeof(data) === 'string') {
        data = [data];
    }

    for (var i = 0; i < data.length; i++) {
        sockets[userId + ':' + network].write(data[i] + '\r\n');
    }
});

courier.start();
