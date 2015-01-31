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

let assert = require('assert'),
    redis = require('../lib/redis').createClient(),
    outbox = require('../lib/outbox'),
    conversationFactory = require('./conversation');

exports.create = function*(userId, conversationId) {
    return yield create(userId, conversationId);
};

exports.setup1on1 = function*(userId, peerUserId, network) {
    let conversation = yield conversationFactory.create({
        owner: userId,
        type: '1on1',
        name: '',
        network: network
    });

    yield conversation.set1on1Members(userId, peerUserId);
    yield create(userId, conversation.conversationId);

    return conversation;
};

exports.remove = function*(userId, windowId) {
    yield remove(userId, windowId);
};

exports.removeByConversationId = function*(userId, conversationId) {
    let windows = yield redis.smembers('windowlist:' + userId);

    for (var i = 0; i < windows.length; i++) {
        let myConversationId = yield getConversationId(userId, windows[i]);

        if (myConversationId === conversationId) {
            yield remove(userId, windows[i]);
        }
    }
};

exports.findByConversationId = function*(userId, conversationId) {
    assert(conversationId);

    return yield redis.hget('index:windowIds', userId + ':' + conversationId);
};

exports.getAllConversationIds = function*(userId) {
    return yield getAllConversationIds(userId);
};

exports.getAllConversationIdsWithUserId = function*(userId, targetUserId) {
    assert(userId !== targetUserId);

    let conversationIds = yield getAllConversationIds(userId);
    let res = [];

    function compare(element) {
        return element === targetUserId;
    }

    for (var i = 0; i < conversationIds.length; i++) {
        let conversation = yield conversationFactory.get(conversationIds[i]);
        let members = Object.keys(conversation.members);

        let exists = members.some(compare);

        if (exists) {
            res.push(conversationIds[i]);
        }
    }

    return res;
};

exports.getWindowIdsForNetwork = function*(userId, network) {
    let windows = yield redis.smembers('windowlist:' + userId);
    let windowIds = [];

    for (var i = 0; i < windows.length; i++) {
        let conversationId = yield getConversationId(userId, windows[i]);
        let conversation = yield conversationFactory.get(conversationId);

        if (conversation.network === network) {
            windowIds.push(windows[i]);
        }
    }

    return windowIds;
};

exports.getNetworks = function*(userId) {
    let conversationIds = yield getAllConversationIds(userId);
    let networks = {};
    let res = [];

    for (var i = 0; i < conversationIds.length; i++) {
        let conversation = yield conversationFactory.get(conversationIds[i]);
        networks[conversation.network] = true;
    }

    Object.keys(networks).forEach(function(key) {
        res.push(key);
    });

    return res;
};

exports.getConversationId = function*(userId, windowId) {
    return yield getConversationId(userId, windowId);
};

function *create(userId, conversationId) {
    let windowId = yield redis.hincrby('user:' + userId, 'nextwindowid', 1);
    let conversation = yield conversationFactory.get(conversationId);
    let userId1on1 = null;

    assert(conversation);

    let newWindow = {
        conversationId: conversationId,
        sounds: false,
        titleAlert: false,
        visible: true,
        row: 0,
        column: 0
    };

    yield redis.hmset('window:' + userId + ':' + windowId, newWindow);
    yield redis.sadd('windowlist:' + userId, windowId);

    if (conversation.type === '1on1') {
        let ids = Object.keys(conversation.members);
        userId1on1 = ids[0] === userId ? ids[1] : ids[0];
    }

    yield redis.hset('index:windowIds', userId + ':' + conversationId, windowId);

    let createMsg = {
        id: 'CREATE',
        windowId: windowId,
        name: conversation.name,
        userId: userId1on1,
        type: conversation.type,
        network: conversation.network,
        password: conversation.password || null,
        topic: conversation.topic,
        titleAlert: newWindow.titleAlert,
        visible: newWindow.visible,
        row: newWindow.row,
        column: newWindow.column,
        sounds: newWindow.sounds,
        role: 'u' // Everybody starts as a normal user
    };

    yield outbox.queueAll(userId, createMsg);
    return windowId;
}

function *getAllConversationIds(userId) {
    let windows = yield redis.smembers('windowlist:' + userId);
    let conversationIds = [];

    for (var i = 0; i < windows.length; i++) {
        let conversationId = yield getConversationId(userId, windows[i]);
        conversationIds.push(conversationId);
    }

    return conversationIds;
}

function *getConversationId(userId, windowId) {
    return yield redis.hget('window:' + userId + ':' + windowId, 'conversationId');
}

function *remove(userId, windowId) {
    let conversationId = yield getConversationId(userId, windowId);

    yield redis.srem('windowlist:' + userId, windowId);
    yield redis.del('window:' + userId + ':' + windowId);
    yield redis.hdel('index:windowIds', userId + ':' + conversationId);

    yield outbox.queueAll(userId, {
        id: 'CLOSE',
        windowId: parseInt(windowId)
    });
}
