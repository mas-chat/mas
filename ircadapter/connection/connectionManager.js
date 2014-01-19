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

var wrapper = require('co-redis'),
    redis = wrapper(require('redis').createClient()),
    plainRedis = require('redis');
    net = require('net'),
    pubSubClient = plainRedis.createClient();

var socketList = {}

pubSubClient.on("message", processMessage);

pubSubClient.subscribe("tcpCommands");

function processMessage(channel, message) {
    message = JSON.parse(message);

    console.log('Rcvd message: ' + message.action);

    switch (message.action) {
        case 'connect':
            connect(message.host, message.port, message.id);
            break;
        case 'write':
            write(message.data);
            break;
    }
}

function connect(host, port, id) {
    var options = {
        port: port,
        host: host
    };

    var client = net.connect(options, connected);

    function connected() {
        console.log('client connected');

        client.on('data', function(data) {
            console.log(data.toString());
        });

        client.on('end', function() {
            console.log('client disconnected');
        });
    }

    socketList[id] = client;
}

function write(data, id) {
    socketList[id].write(data);
}



// TBD: Handle PING/PONG here

// tcpMessages (list)
//   {
//     action: connect/disconnect/send
//   }

// {
//     action: 'connect',
//     host: 'irc.example.org',
//     port: '6667'
// }




// tcpResponses
//  {
//     type :data/event
//  }
// newSend
// newRcvd

// id = connect()
// send(id, data)
// close(id)

// events

// rcvd
// opened
// closed


