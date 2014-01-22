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
    co = require('co');
    net = require('net'),
    pubSubClient = plainRedis.createClient();

var users = {}

var serverList = {
    MeetAndSpeak: { host: "localhost", port: 6667, unknown: 9999 },
    IRCNet: { host: "ircnet.eversible.com", port: 6666, unknown: 100 },
    FreeNode: { host: "irc.freenode.net", port: 6667, unknown: 5 },
    W3C: { host: "irc.w3.org", port: 6665, unknown: 5 }
};

function init() {
    co(function *(){
        var allUsers = yield redis.smembers('userlist');

        for (var i=0; i < allUsers.length; i++) {
            var id = allUsers[i];

            if (!(id in users)) {
                var userInfo = yield redis.hgetall('user:' + id);

                console.log('Importing user ' + userInfo.nick);
                users[id] = {};

                var connectDelay = Math.floor((Math.random() * 180));
                var windows = yield redis.smembers('windowlist:' + id);

                // Make sure that we connect to Evergreen network
                for (var ii=0; ii < windows.length; ii++) {
                    // Format in Redis is "id:network:name"
                    console.log('raw windowlist: ' + windows[ii]);
                    var network = (windows[ii].split(':'))[1];

                    if (network !== '0') {
                        // TBD: Implement. Wait connectDelay then connect()
                    }
                }

                // MeetAndSpeak network, always, no delay
                users[id].socket = connect(serverList.MeetAndSpeak.host, serverList.MeetAndSpeak.port, id);

                // TBD: Move to parser, only trigger connected evet in this module
                write(id, "NICK " + userInfo.nick + "\r\nUSER " + userInfo.nick +" 8 * :Real Name (Ralph v1.0)\r\n");
            }
        }
    })()
}

init();

pubSubClient.on("message", processMessage);
pubSubClient.subscribe("tcpCommands");

function processMessage(channel, message) {
    message = JSON.parse(message);

    console.log('Rcvd message: ' + message.action);

    switch (message.action) {
        case 'add':
            // TBD
            break;
        case 'connect':
            // TBD: Rethink
            connect(message.host, message.port, message.id);
            break;
        case 'disconnect':
            // TBD
            break;
        case 'write':
            write(message.id, message.data);
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

    return client;
}

function write(id, data) {
    users[id].socket.write(data);
}

// TBD: Handle PING/PONG here
//
// tcpMessages (list)
//   {
//     action: connect/disconnect/send
//   }
//
// {
//     action: 'connect',
//     host: 'irc.example.org',
//     port: '6667'
// TBD nick: xxx,
// TBD realName: yyy
// }
//
// tcpResponses
//  {
//     type :data/event
//  }
// newSend
// newRcvd
//
// events:
//
// rcvd
// opened
// closed
