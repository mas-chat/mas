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
    outbox = require('./outbox.js'),
    windowHelper = require('./windows');

// TDB Consider options:
//
// timestamp
// type
// rememberurl
// hidden

exports.broadcast = function *(userId, network, nick, cat, text) {
    var windowIds = yield windowHelper.getWindowIdsForNetwork(userId, network);

    for (var i = 0; i < windowIds.length; i++) {
        yield sendMessage(userId, windowIds[i], nick, cat, text);
    }
};

exports.send = function *(userId, network, group, nick, cat, text) {
    var windowId = yield windowHelper.getWindowID(userId, network, group);

    if (windowId) {
        yield sendMessage(userId, windowId, nick, cat, text);
    }
};

function *sendMessage(userId, windowId, nick, cat, text) {
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
    yield outbox.queue(userId, command);
}
