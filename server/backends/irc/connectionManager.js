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

var net = require('net'),
    carrier = require('carrier'),
    courier = require('../../lib/courier').createEndPoint('connectionmanager');

var sockets = {};

courier.sendNoWait('ircparser', 'ready');

// Connect
courier.on('connect', function(params) {
    var userId = params.userId;
    var network = params.network;
    var options = {
        port: params.port,
        host: params.host
    };

    var client = net.connect(options);

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

    if (typeof(data) === 'string') {
        data = [data];
    }

    for (var i = 0; i < data.length; i++) {
        sockets[userId + ':' + network].write(data[i] + '\r\n');
    }
});
