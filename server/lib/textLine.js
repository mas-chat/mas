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

var redis = require('./redis').createClient(),
    outbox = require('./outbox.js'),
    windowHelper = require('./windows'),
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
        yield processTextLine(userId, windowIds[i], nick, cat, text);
    }
};

exports.send = function *(userId, network, group, nick, cat, text) {
    var windowId = yield windowHelper.getWindowId(userId, network, group);
    yield processTextLine(userId, windowId, nick, cat, text);
};

exports.sendByWindowId = function *(userId, windowId, nick, cat, text) {
    yield processTextLine(userId, windowId, nick, cat, text);
};

exports.sendNicks = function *(userId, sessionId) {
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

    sessionId = sessionId; // TBD Send to queue()
    yield outbox.queue(userId, command);
};

function *processTextLine(userId, windowId, nick, cat, text) {
    if (!windowId) {
        return;
    }

    var command = JSON.stringify({
        id: 'ADDTEXT',
        windowId: windowId,
        nick: nick,
        body: text,
        cat: cat,
        ts: 209,
        type: 0
    });

    yield redis.run('processTextLine', [], [ userId, windowId, command ]);
}
