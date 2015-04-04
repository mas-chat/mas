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

const assert = require('assert'),
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

exports.isValidDesktop = function *(userId, desktop) {
    let windows = yield redis.smembers(`windowlist:${userId}`);
    let found = false;

    for (let windowId of windows) {
        // TBD: Too many redis calls, re-factor to lua later.
        let existingDesktop = yield redis.hget(`window:${userId}:${windowId}`, 'desktop');

        if (parseInt(existingDesktop) === desktop) {
            found = true;
            break;
        }
    }

    return found;
};

exports.removeByConversationId = function*(userId, conversationId) {
    let windows = yield redis.smembers(`windowlist:${userId}`);

    for (let masWindow of windows) {
        let myConversationId = yield getConversationId(userId, masWindow);

        if (myConversationId === conversationId) {
            yield remove(userId, masWindow);
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

exports.getWindowIdsForNetwork = function*(userId, network) {
    let windows = yield redis.smembers(`windowlist:${userId}`);
    let windowIds = [];

    for (let masWindow of windows) {
        let conversationId = yield getConversationId(userId, masWindow);
        let conversation = yield conversationFactory.get(conversationId);

        if (conversation.network === network) {
            windowIds.push(masWindow);
        }
    }

    return windowIds;
};

exports.getNetworks = function*(userId) {
    let conversationIds = yield getAllConversationIds(userId);
    let networks = {};
    let res = [];

    for (let conversationId of conversationIds) {
        let conversation = yield conversationFactory.get(conversationId);
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
    let windowId = yield redis.hincrby(`user:${userId}`, 'nextwindowid', 1);
    let conversation = yield conversationFactory.get(conversationId);
    let userId1on1 = null;

    assert(conversation);

    let currentDesktop = parseInt(yield redis.hget(`settings:${userId}`, 'activeDesktop'));

    let newWindow = {
        conversationId: conversationId,
        sounds: false,
        titleAlert: false,
        minimizedNamesList: false,
        desktop: currentDesktop || 0,
        visible: true,
        row: 0,
        column: 0
    };

    yield redis.hmset(`window:${userId}:${windowId}`, newWindow);
    yield redis.sadd(`windowlist:${userId}`, windowId);

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
        minimizedNamesList: newWindow.minimizedNamesList,
        desktop: newWindow.desktop,
        role: 'u' // Everybody starts as a normal user
    };

    yield outbox.queueAll(userId, createMsg);
    return windowId;
}

function *getAllConversationIds(userId) {
    let windows = yield redis.smembers(`windowlist:${userId}`);
    let conversationIds = [];

    for (let masWindow of windows) {
        let conversationId = yield getConversationId(userId, masWindow);
        conversationIds.push(conversationId);
    }

    return conversationIds;
}

function *getConversationId(userId, windowId) {
    return parseInt(yield redis.hget(`window:${userId}:${windowId}`, 'conversationId'));
}

function *remove(userId, windowId) {
    let conversationId = yield getConversationId(userId, windowId);

    yield redis.srem(`windowlist:${userId}`, windowId);
    yield redis.del(`window:${userId}:${windowId}`);
    yield redis.hdel('index:windowIds', userId + ':' + conversationId);

    yield outbox.queueAll(userId, {
        id: 'CLOSE',
        windowId: parseInt(windowId)
    });
}
