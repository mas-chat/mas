#!/usr/bin/env node --harmony
//
//   Copyright 2013 Ilkka Oksanen <iao@iki.fi>
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

// Minimal connection manager that keeps TCP sockets alive even if
// rest of the system is restarted. Allows nondistruptive updates.

var wrapper = require('co-redis'),
    redis = wrapper(require('redis').createClient()),
    co = require('co'),
    net = require('net'),
    carrier = require('carrier'),
    courier = require('../lib/courier');

var sockets = {};

co(main)();

function *main() {
    yield courier.send('ircparser', 'ready');

    while (1) {
        var message = yield courier.receive('connectionmanager');
        var userId = message.userId;
        var network = message.network;

        switch (message.type) {
            case 'connect':
                connect(userId, network, message.host, message.port);
                break;
            case 'disconnect':
                disconnect(userId, network);
                break;
            case 'write':
                write(userId, network, message.line);
                break;
        }
    }
}

function connect(userId, network, host, port) {
    var options = {
        port: port,
        host: host
    };

    var client = net.connect(options);

    client.on('connect', function () {
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
            data: line
        });
    });

    client.on('end', function() {
        courier.sendNoWait('ircparser', 'disconnected');
    });

    sockets[userId + ':' + network] = client;
}

function disconnect(userId, network) {
    sockets[userId + ':' + network].end();
    delete sockets[userId + ':' + network];
}

function write(userId, network, data) {
    if (typeof(data) === 'string') {
        data = [ data ];
    }

    for (var i = 0; i < data.length; i++) {
        console.log('WRITE: ' + data[i] + ', userId: ' + userId);
        sockets[userId + ':' + network].write(data[i] + '\r\n');
    }
}
