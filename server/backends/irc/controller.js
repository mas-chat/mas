#!/usr/bin/env node --harmony
//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
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

process.title = 'mas-irc';

var co = require('co'),
    log = require('../../lib/log'),
    common = require('../../lib/common'),
    redisModule = require('../../lib/redis'),
    redis = redisModule.createClient(),
    courier = require('../../lib/courier').createEndPoint('ircparser'),
    outbox = require('../../lib/outbox'),
    textLine = require('../../lib/textLine'),
    windowHelper = require('../../lib/windows'),
    nicks = require('../../lib/nick'),
    conf = require('../../lib/conf');

common.init();

co(function *() {
    yield redisModule.loadScripts();

    courier.on('send', processSend);
    courier.on('join', processJoin);
    courier.on('close', processClose);
    courier.on('restarted', processRestarted);
    courier.on('data', processData);
    courier.on('connected', processConnected);
    courier.on('disconnected', processDisconnected);
    courier.start();
})();

// Upper layer messages

function *processSend(params) {
    yield courier.send('connectionmanager', {
        type: 'write',
        userId: params.userId,
        network: params.network,
        line: 'PRIVMSG ' + params.name + ' :' + params.text
    });
}

function *processJoin(params) {
    var state = yield redis.hget('networks:' + params.userId + ':' + params.network, 'state');
    var channelName = params.name;
    var hasChannelPrefixRegex = /^[&#!+]/;
    var illegalNameRegEx = /\s|\cG|,/; // See RFC2812, section 1.3

    if (!channelName || channelName === '' || illegalNameRegEx.test(channelName)) {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'JOIN_RESP',
            status: 'error',
            errorMsg: 'Illegal or missing channel name.'
        });
        return;
    }

    if (!hasChannelPrefixRegex.test(channelName)) {
        channelName = '#' + channelName;
    }

    if (!state || state === 'disconnected') {
        yield connect(params.userId, params.network);
    }

    if (state === 'connected') {
        yield courier.send('connectionmanager', {
            type: 'write',
            userId: params.userId,
            network: params.network,
            line: 'JOIN ' + channelName + ' ' + params.password
        });
    }

    var createCommand = yield windowHelper.createNewWindow(params.userId, params.network,
        channelName, params.password, 'group');

    yield outbox.queue(params.userId, params.sessionId, {
        id: 'JOIN_RESP',
        status: 'ok',
    });

    yield outbox.queue(params.userId, true, createCommand);
}

function *processClose(params) {
    var state = yield redis.hget('networks:' + params.userId + ':' + params.network, 'state');

    if (state === 'connected') {
        // TBD: Don't send part if 1on1
        yield sendIRCPart(params.userId, params.network, params.name);
    }
}

// Connection manager messages

// Restarted
function *processRestarted() {
    var allUsers = yield redis.smembers('userlist');

    for (var i = 0; i < allUsers.length; i++) {
        var userId = parseInt(allUsers[i]);
        var networks = yield windowHelper.getNetworks(userId);

        for (var ii = 0; ii < networks.length; ii++) {
            if (networks[ii] !== 'MAS') {
                log.info(userId, 'Connecting to IRC network: ' + networks[ii]);
                yield connect(userId, networks[ii]);
            }
        }
    }
}

// Data
function *processData(params) {
    var line = params.line,
        parts = line.split(' '),
        msg = {};

    // See rfc2812

    if ((line.charAt(0) === ':')) {
        // Prefix exists
        var prefix = parts.shift();

        var nickEnds = prefix.indexOf('!');
        var identEnds = prefix.indexOf('@');

        if (nickEnds === -1 && identEnds === -1) {
            msg.serverName = prefix.substring(1);
        } else {
            msg.nick = prefix.substring(1, Math.min(nickEnds, identEnds));
            msg.userNameAndHost = prefix.substring(Math.min(nickEnds + 1, identEnds + 1));
        }
    }

    msg.command = parts.shift();

    if (msg.command.match(/^[0-9]+$/) !== null) {
        // Numeric reply
        msg.target = parts.shift();

        if (/^[&#!+]/.test(msg.target)) {
            // Channel names are case insensitive, always use lower case version
            msg.target = msg.target.toLowerCase();
        }
    }

    msg.params = [];
    msg.network = params.network;

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
        yield handlers[msg.command](params.userId, msg, msg.command);
    }
}

// Connected
function *processConnected(params) {
    var userInfo = yield redis.hgetall('user:' + params.userId);
    log.info('Importing user ' + userInfo.nick);

    var commands = [
        'NICK ' + userInfo.nick,
        'USER ' + userInfo.nick + ' 8 * :Real Name (Ralph v1.0)'
    ];

    yield courier.send('connectionmanager', {
        type: 'write',
        userId: params.userId,
        network: params.network,
        line: commands
    });
}

// Disconnect
function *processDisconnected(params) {
    yield redis.hset('networks:' + params.userId + ':' + params.network, 'state', 'disconnected');
}

function *connect(userId, network) {
    // TBD: Remove connection restriction
    // TBD: Enable connectDelay if !MAS. Make it configurable
    // var connectDelay = Math.floor((Math.random() * 180));
    var nick = yield redis.hget('user:' + userId, 'nick');
    yield redis.hset('user:' + userId, 'currentnick:' + network, nick);
    yield redis.hset('networks:' + userId + ':' + network, 'state', 'connecting');

    yield redis.hset('networks:' + userId, network, 'connecting');

    yield courier.send('connectionmanager', {
        type: 'connect',
        userId: userId,
        nick: nick,
        network: network,
        host: conf.get('irc:networks:' + network + ':host'),
        port: conf.get('irc:networks:' + network + ':port')
    });
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

    '353': handle353,
    '366': handle366,
    '376': handle376,
    '433': handle433,

    'JOIN': handleJoin,
    'PRIVMSG': handlePrivmsg,
    'PING': handlePing
};

function *handleServerText(userId, msg, code) {
    // :mas.example.org 001 toyni :Welcome to the MAS IRC toyni
    var text = msg.params[0];
    var cat = 'notice';

    // 375 = MOTD line
    if (code === '372') {
        cat = 'banner';
    }

    yield textLine.broadcast(userId, msg.network, {
        nick: msg.serverName,
        cat: cat,
        body: text,
        ts: Math.round(Date.now() / 1000)
    });
}

function *handlePing(userId, msg) {
    var server = msg.params[0];
    var resp = 'PONG ' + server;

    yield courier.send('connectionmanager', {
        type: 'write',
        userId: userId,
        network: msg.network,
        line: resp
    });
}

function *handle353(userId, msg) {
    // :own.freenode.net 353 drwillie @ #evergreenproject :drwillie ilkkaoks
    var channel = msg.params[1];
    var windowId = yield windowHelper.getWindowId(userId, msg.network, channel);
    var names = msg.params[2].split(' ');

    yield updateNamesSets(names, userId, windowId);
}

function *handle366(userId, msg) {
    // :pratchett.freenode.net 366 il3kkaoksWEB #testi1 :End of /NAMES list.
    var channel = msg.params[0];

    var windowId = yield windowHelper.getWindowId(userId, msg.network, channel);
    var ops = yield redis.smembers('names:' + userId + ':' + windowId + ':ops');
    var users = yield redis.smembers('names:' + userId + ':' + windowId + ':users');

    yield outbox.queue(userId, true, {
        id: 'ADDNAMES',
        reset: true,
        windowId: windowId,
        operators: ops,
        users: users
    });
}

function *handle376(userId, msg) {
    yield redis.hset('networks:' + userId + ':' + msg.network, 'state', 'connected');

    var channels = yield windowHelper.getWindowNamesForNetwork(userId, msg.network);

    //TBD don't join to 1on1s

    for (var i = 0; i < channels.length; i++) {
        var windowId = yield windowHelper.getWindowId(userId, msg.network, channels[i]);

        yield outbox.queue(userId, true, {
            id: 'ADDNAMES',
            reset: true,
            windowId: windowId,
        });

        yield courier.send('connectionmanager', {
            type: 'write',
            userId: userId,
            network: msg.network,
            line: 'JOIN ' + channels[i]
        });
    }

    yield nicks.sendNick(userId, true);
}

function *handle433(userId, msg) {
    // :mas.example.org 433 * ilkka :Nickname is already in use.
    yield tryDifferentNick(userId, msg.network);
}

function *handleJoin(userId, msg) {
    // :neo!i=ilkkao@iao.iki.fi JOIN :#testi4
    var channel = msg.params[0];
    var windowId = yield windowHelper.getWindowId(userId, msg.network, channel);
    var currentNick = yield redis.hget('user:' + userId, 'currentnick:' + msg.network);

    if (!windowId) {
        // User has closed the window very recently
        yield sendIRCPart(userId, msg.network, channel);
        return;
    }

    if (msg.nick === currentNick) {
        yield redis.del('names:' + userId + ':' + windowId + ':ops',
            'names:' + userId + ':' + windowId + ':users');
    } else {
        var names = [ msg.nick ];
        yield updateNamesSets(names, userId, windowId);

        yield outbox.queue(userId, true, {
            id: 'ADDNAMES',
            reset: false,
            windowId: windowId,
            users: [ msg.nick ]
        });
    }

    yield textLine.send(userId, msg.network, channel, {
        cat: 'info',
        body: msg.nick + ' (' + msg.userNameAndHost + ') has joined channel ' + channel,
        ts: Math.round(Date.now() / 1000)
    });
}

function *handlePrivmsg(userId, msg) {
    var group = msg.params[0];
    var text = msg.params[1];

    // if (0) { // TBD target === currentNick
    // } else {
    // }

    yield textLine.send(userId, msg.network, group, {
        nick: msg.nick,
        cat: 'msg',
        body: text,
        ts: Math.round(Date.now() / 1000)
    });
}

function *tryDifferentNick(userId, network) {
    // TBD Set currentnick to nick and send NICK periodically to trigger this
    // method to try to reclaim the real nick

    var result = yield redis.hmget('user:' + userId, 'nick', 'currentnick:' + network);
    var nick = result[0];
    var currentNick = result[1];

    var state = yield redis.hget('networks:' + userId + ':' + network, 'state');
    var nickHasNumbers = false;

    if (nick !== currentNick.substring(0, nick.length)) {
        // Current nick is unique ID, let's try to change it to something unique immediately
        currentNick = nick + (100 + Math.floor((Math.random()*900)));
    } else if (currentNick === nick) {
        // Second best choice
        currentNick = nick + '_';
    } else if (currentNick === nick + '_') {
        // Third best choice
        currentNick = nick + (Math.floor((Math.random()*10)));
        nickHasNumbers = true;
    } else {
        // If all else fails, keep adding random numbers
        currentNick = currentNick + (Math.floor((Math.random()*10)));
        nickHasNumbers = true;
    }

    yield redis.hset('user:' + userId, 'currentnick:' + network, currentNick);

    // If we are joining IRC try all alternatives. If we are connected,
    // try to get only 'nick' or 'nick_' back
    if (!(state === 'connected' && nickHasNumbers)) {
        yield courier.send('connectionmanager', {
            type: 'write',
            userId: userId,
            network: network,
            line: 'NICK ' + currentNick
        });
    }
}

function *sendIRCPart(userId, network, channel) {
    yield courier.send('connectionmanager', {
        type: 'write',
        userId: userId,
        network: network,
        line: 'PART ' + channel
    });
}

function *updateNamesSets(names, userId, windowId) {
    var users = [];
    var ops = [];

    for (var i = 0; i < names.length; i++) {
        if (names[i].charAt(0) === '@') {
            ops.push(names[i].substring(1));
        } else {
            users.push(names[i]);
        }
    }

    if (ops.length > 0) {
        yield redis.sadd('names:' + userId + ':' + windowId + ':ops', ops);
    }

    if (users.length > 0) {
        yield redis.sadd('names:' + userId + ':' + windowId + ':users', users);
    }
}
