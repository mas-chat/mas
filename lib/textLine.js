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

var wrapper = require('co-redis'),
    redis = wrapper(require('redis').createClient()),
    outbox = require('../server/lib/outbox.js'),
    windowHelper = require('../server/lib/windows'),
    networkList = require('./networks');

// TDB Consider options:
//
// timestamp
// type
// rememberurl
// hidden

exports.broadcast = function *(userId, network, nick, cat, text) {
    var windowIds = yield windowHelper.getWindowIdsForNetwork(userId, network);

    for (var i = 0; i < windowIds.length; i++) {
        yield processMessage(userId, windowIds[i], nick, cat, text, false);
    }
};

exports.send = function *(userId, network, group, nick, cat, text) {
    var windowId = yield windowHelper.getWindowId(userId, network, group);
    yield processMessage(userId, windowId, nick, cat, text, false);
};

exports.save = function *(userId, windowId, nick, cat, text) {
    yield processMessage(userId, windowId, nick, cat, text, true);
};

exports.sendNicks = function *(userId) {
    var command = {
        id: 'NICK'
    };

    var redisParams = [ 'user:' + userId ];
    var networks = [];

    for (var network in networkList) { /* jshint -W089 */
        redisParams.push('currentNick:' + network);
        networks.push(network);
    }

    var nicks = yield redis.hmget.apply(redis, redisParams);

    for (var i = 0; i < networks.length; i++) {
        if (nicks[i] !== null) {
            command[networks[i]] = nicks[i];
        }
    }

    yield outbox.queue(userId, command);
};

function *processMessage(userId, windowId, nick, cat, text, saveOnly) {
    if (!windowId) {
        return;
    }

    var command = JSON.stringify({
        id: 'ADDTEXT',
        window: windowId,
        nick: nick,
        body: text,
        cat: cat,
        ts: '209',
        type: 0
    });

    yield redis.lpush('windowmsgs:' + userId + ':' + windowId, command);

    if (!saveOnly) {
        yield outbox.queue(userId, command);
    }
}
