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

var redis = require('../lib/redis').createClient(),
    outbox = require('../lib/outbox'),
    conf = require('../lib/conf');

exports.sendNickAll = function*(userId) {
    var command = yield buildCommand(userId);
    yield outbox.queueAll(userId, command);
};

exports.sendNick = function*(userId, sessionId) {
    var command = yield buildCommand(userId);
    yield outbox.queue(userId, sessionId, command);
};

exports.updateCurrentNick = function*(userId, network, nick) {
    yield removeCurrentNickFromIndex(userId, network);

    yield redis.hset('networks:' + userId + ':' + network, 'currentnick', nick);
    yield redis.hset('index:currentnick', network + ':' + nick, userId);
};

exports.removeCurrentNick = function*(userId, network) {
    yield removeCurrentNickFromIndex(userId, network);
    yield redis.hset('networks:' + userId + ':' + network, 'currentnick', '');
};

exports.getUserIdFromNick = function*(nick, network) {
    return yield redis.hget('index:currentnick', network + ':' + nick);
};

exports.getCurrentNick = getCurrentNick;

function *getCurrentNick(userId, network) {
    return yield redis.hget('networks:' + userId + ':' + network, 'currentnick');
}

function *removeCurrentNickFromIndex(userId, network) {
    var oldNick = yield redis.hget('networks:' + userId + ':' + network, 'currentnick');

    if (oldNick) {
        yield redis.hdel('index:currentnick', network + ':' + oldNick);
    }
}

function *buildCommand(userId) {
    var command = {
        id: 'NICK',
        MAS: yield redis.hget('user:' + userId, 'nick')
    };

    // Add IRC networks
    for (var network in conf.get('irc:networks')) { /* jshint -W089 */
        var nick = yield getCurrentNick(userId, network);

        if (nick !== null) {
            command[network] = nick;
        }
    }

    return command;
}
