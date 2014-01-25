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

co(process)();

function *process() {
    while (1) {
        var result = yield redis.brpop('parserinbox', 0);
        var message = JSON.parse(result[1]);

        if (message.type === 'data') {
            yield processIRCLine(message.userId, message.network, message.data);
        }
    }
}

function *processIRCLine(userId, network, line) {
    // See rfc2812
    var parts = line.split(' '),
        params;
        msg = {};

    console.log('Prosessing: ' + line);

    if ((line.charAt(0) === ':')) {
        // Prefix exists
        var prefix = parts.shift();

        var nickEnds = prefix.indexOf('!');
        var identEnds = prefix.indexOf('@');

        if (nickEnds === -1 && identEnds === -1) {
            msg.serverName = prefix;
        } else {
            msg.nick = prefix.subString(0, Math.min(nickEnds,identEnds));
            msg.userNameAndHost = prefix.subString(Math.min(nickEnds,identEnds));
        }
        msg.command = parts.shift();
    } else {
        msg.command = parts.shift();
    }

    if (msg.command.match(/^[0-9]+$/) !== null) {
        // Numeric reply
        msg.target = parts.shift();
    }

    // Only the parameters are left now
    params = parts;
    msg.params = [];

    while (params.length !== 0) {
        if (params[0].charAt(0) === ':') {
            msg.params.push(params.join(' ').substring(1));
            break;
        } else {
            msg.params.push(params.shift());
        }
    }

    if (handlers[msg.command]) {
        yield handlers[msg.command](userId, network, msg);
    }
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
    '452': handleServerText
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

    console.log('got 001 ' + text);
}
