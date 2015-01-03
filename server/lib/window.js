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

var assert = require('assert'),
    redis = require('./redis').createClient(),
    conversation = require('./conversation'),
    outbox = require('./outbox'),
    log = require('./log');

exports.create = function*(userId, conversationId) {
    var windowId = yield redis.hincrby('user:' + userId, 'nextwindowid', 1);
    var conversationRecord = yield conversation.get(conversationId);
    var members = yield conversation.getMembers(conversationId);
    var userId1on1 = null;

    assert(conversation);
    assert(members);

    var newWindow = {
        conversationId: conversationId,
        sounds: false,
        titleAlert: false,
        visible: true,
        row: 0
    };

    yield redis.hmset('window:' + userId + ':' + windowId, newWindow);
    yield redis.sadd('windowlist:' + userId, windowId);

    if (conversationRecord.type === '1on1') {
        var ids = Object.keys(members);
        userId1on1 = ids[0] === userId ? ids[1] : ids[0];
    }

    yield redis.hset('index:windowIds', userId + ':' + conversationId, windowId);

    var createMsg = {
        id: 'CREATE',
        windowId: windowId,
        name: conversationRecord.name,
        userId: userId1on1,
        type: conversationRecord.type,
        network: conversationRecord.network,
        password: conversationRecord.password || null,
        topic: conversationRecord.topic,
        titleAlert: newWindow.titleAlert,
        visible: newWindow.visible,
        row: newWindow.row,
        sounds: newWindow.sounds,
        role: members[userId]
    };

    yield outbox.queueAll(userId, createMsg);
    return windowId;
};

exports.remove = function*(userId, windowId) {
    var conversationId = yield getConversationId(userId, windowId);

    yield redis.srem('windowlist:' + userId, windowId);
    yield redis.del('window:' + userId + ':' + windowId);
    yield redis.hdel('index:windowIds', userId + ':' + conversationId);
};

exports.findByConversationId = function*(userId, conversationId) {
    assert(conversationId);

    return yield redis.hget('index:windowIds', userId + ':' + conversationId);
};

exports.getAllConversationIds = function*(userId) {
    return yield getAllConversationIds(userId);
};

exports.getWindowIdsForNetwork = function*(userId, network) {
    var conversationIds = yield getAllConversationIds();
    var res = [];

    for (var i = 0; i < conversationIds.length; i++) {
        var conversationRecord = conversation.get(conversationIds[i]);

        if (conversationRecord.network === network) {
            res.push(conversationIds[i]);
        }
    }

    return res;
};

exports.getConversationId = function*(userId, windowId) {
    return yield getConversationId(userId, windowId);
};

function *getAllConversationIds(userId) {
    var windows = yield redis.smembers('windowlist:' + userId);
    var conversationIds = [];

    for (var i = 0; i < windows.length; i++) {
        var conversationId = yield getConversationId(userId, windows[i]);
        conversationIds.push(conversationId);
    }

    return conversationIds;
}

function *getConversationId(userId, windowId) {
    return yield redis.hget('window:' + userId + ':' + windowId, 'conversationId');
}
