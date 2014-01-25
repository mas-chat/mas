//
//   Copyright 2009-2013 Ilkka Oksanen <iao@iki.fi>
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
    redis = wrapper(require('redis').createClient());
    co = require('co'),
    textLine = require('../../server/lib/textLine');

var handlers = {};

co(main)();

function *main() {
    var result, message;

    while (1) {
        result = yield redis.brpop('parserinbox', 0),
        message = JSON.parse(result[1]);

        console.log('MSG RCVD: ' + message.type);

        switch (message.type) {
            // Upper layer messages
            case 'addText':
                yield processAddText(message.userId, message.network, message.text);
                break;

            // Connection manager messages
            case 'data':
                yield processIRCLine(message.userId, message.network, message.data);
                break;
            case 'connected':
                // TBD
                break;
            case 'disconnected':
                // TBD
                break;
        }
    }
}

function *processIRCLine(userId, network, line) {
    var parts = line.split(' '),
        params;
        msg = {};

    console.log('Prosessing IRC line: ' + line);

    // See rfc2812

    if ((line.charAt(0) === ':')) {
        // Prefix exists
        var prefix = parts.shift();

        var nickEnds = prefix.indexOf('!');
        var identEnds = prefix.indexOf('@');

        if (nickEnds === -1 && identEnds === -1) {
            msg.serverName = prefix;
        } else {
            msg.nick = prefix.substring(0, Math.min(nickEnds,identEnds));
            msg.userNameAndHost = prefix.substring(Math.min(nickEnds,identEnds));
        }
    }

    msg.command = parts.shift();

    if (msg.command.match(/^[0-9]+$/) !== null) {
        // Numeric reply
        msg.target = parts.shift();
    }

    msg.params = [];

    // Only the parameters are left now
    while (parts.length !== 0) {
        if (parts[0].charAt(0) === ':') {
            msg.params.push(parts.join(' ').substring(1));
            break;
        } else {
            msg.params.push(parts.shift());
        }
    }

    if (handlers[msg.command]) {
        yield handlers[msg.command](userId, network, msg);
    }
}

function *processAddText(userId, network, text) {
    var message = {
        userId: userId,
        network: network,
        line: 'PRIVMSG #test ' + text,
        action: 'write'
    };

    yield redis.lpush('connectionmanagerinbox', JSON.stringify(message));
}

// Process different IRC commands

var handlers = {
    '001': handleServerText,
    '002': handleServerText,
    '003': handleServerText,
    '005': handleServerText,
    '020': handleServerText,
    '042': handleServerText,
    '242': handleServerText,
    '250': handleServerText,
    '251': handleServerText,
    '252': handleServerText,
    '253': handleServerText,
    '254': handleServerText,
    '255': handleServerText,
    '265': handleServerText,
    '266': handleServerText,
    '372': handleServerText,
    '375': handleServerText,
    '452': handleServerText,

    '376': handle376,

    'PRIVMSG': handlePrivmsg,
    'PING': handlePing
};

function *handleServerText(userId, network, msg) {
    //:mas.example.org 001 toyni :Welcome to the MAS IRC toyni
    var text = msg.params.join(' ');

    // TDB options for addLine()
    //timestamp
    //type
    //rememberurl
    //hidden
    //cat ??
    //nickname ??

    yield textLine.broadcast(userId, network, 'notice', text);
}

function *handlePing(userId, network, msg) {
    var server = msg.params[0];
    var resp = 'PONG ' + server;

    var message = {
        userId: userId,
        network: network,
        line: resp,
        action: 'write'
    }

    yield redis.lpush('connectionmanagerinbox', JSON.stringify(message));
}

function *handle376(userId, network, msg) {
    var resp = 'JOIN #test';

    var message = {
        userId: userId,
        network: network,
        line: resp,
        action: 'write'
    }

    yield redis.lpush('connectionmanagerinbox', JSON.stringify(message));
}

function *handlePrivmsg(userId, network, msg) {
    var target = msg.params[0];
    var text = msg.params[1];

    yield textLine.broadcast(userId, network, 'msg', text);
}
