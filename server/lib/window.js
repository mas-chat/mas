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
    outbox = require('./outbox'),
    log = require('./log');

exports.getWindowIdsForNetwork = function*(userId, network) {
    var ids = yield getWindowIds(userId, network, null, null, 'id');

    return ids;
};

exports.getGroupWindowIdsForNetwork = function*(userId, network) {
    var ids = yield getWindowIds(userId, network, null, 'group', 'id');

    return ids;
};

exports.getGroupWindowId = function*(userId, network, name) {
    var ids = yield getWindowIds(userId, network, name, 'group', 'id');

    if (ids.length === 1) {
        return ids[0];
    } else {
        log.info(userId, 'Tried to find non-existing group window: ' + name);
        return null;
    }
};

exports.get1on1WindowId = function*(userId, network, targetUserId) {
    var ids = yield getWindowIds(userId, network, targetUserId, '1on1', 'id');

    if (ids.length === 1) {
        return ids[0];
    } else {
        log.info(userId, 'Tried to find non-existing 1on1 window: ' + targetUserId);
        return null;
    }
};

exports.getWindowIdByTargetUserId = function*(userId, targetUserId) {
    var ids = yield getWindowIds(userId, null, null, null, 'id');

    for (var i = 0; i < ids.length; i++) {
        var window = yield redis.hgetall('window:' + userId + ':' + ids[i]);

        if (window.targetUserId === targetUserId) {
            return ids[i];
        }
    }

    return null;
};

exports.getNetworks = function*(userId) {
    var networks = {};

    var windows = yield redis.smembers('windowlist:' + userId);
    for (var i = 0; i < windows.length; i++) {
        var windowNetwork = yield redis.hget('window:' + userId + ':' + windows[i], 'network');
        networks[windowNetwork] = true;
    }

    return Object.keys(networks);
};

exports.getWindowNameAndNetwork = function*(userId, windowId) {
    return yield getWindowNameAndNetwork(userId, windowId);
};

exports.getConversationId = function*(userId, windowId) {
    return yield getConversationId(userId, windowId);
};

exports.create = function*(userId, conversationId) {
    var windowId = yield redis.hincrby('user:' + userId, 'nextwindowid', 1);
    var conversation = yield redis.hgetall('conversation:' + conversationId);
    var members = yield redis.hgetall('conversationmembers:' + conversationId);
    var userId1on1 = null;

    var newWindow = {
        conversationId: conversationId,
        sounds: false,
        titleAlert: false,
        visible: true,
        row: 0
    };

    yield redis.hmset('window:' + userId + ':' + windowId, newWindow);
    yield redis.sadd('windowlist:' + userId, windowId);

    if (conversation.type === '1on1') {
        var ids = Object.keys(members);
        userId1on1 = ids[0] === userId ? ids[1] : ids[0];
    }

    yield redis.hset('index:windowIds', userId + ':' + conversationId, windowId);

    var createMsg = {
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
        sounds: newWindow.sounds,
        role: members[userId]
    };

    yield outbox.queueAll(userId, createMsg);

    return windowId;
};

exports.removeWindow = function*(userId, windowId) {
    var conversationId = yield getConversationId(userId, windowId);

    yield redis.srem('windowlist:' + userId, windowId);
    yield redis.del('window:' + userId + ':' + windowId);
    yield redis.hdel('index:windowIds', userId + ':' + conversationId);
};

function *getWindowNameAndNetwork(userId, windowId) {
    var details = yield redis.hgetall('window:' + userId + ':' + windowId);

    return {
        name: details ? details.name : null,
        userId: details ? details.userId : null,
        network: details ? details.network : null,
        type: details ? details.type : null
    };
}

function *getWindowIds(userId, network, nameOrUserId, type, returnType) {
    var windows = yield redis.smembers('windowlist:' + userId);
    var ret = [];

    for (var i = 0; i < windows.length; i++) {
        var candidateWindowId = parseInt(windows[i]);
        var candidate = yield getWindowNameAndNetwork(userId, candidateWindowId);

        if (network && candidate.network !== network) {
            continue;
        }

        if (type && type !== candidate.type) {
            continue;
        }

        if (nameOrUserId && type === 'group' && candidate.name !== nameOrUserId) {
            continue;
        }

        if (nameOrUserId && type === '1on1' && candidate.userId !== nameOrUserId) {
            continue;
        }

        // We have a match

        if (returnType === 'id') {
            ret.push(candidateWindowId);
        } else if (returnType === 'name') {
            ret.push(candidate.name);
        }
    }

    return ret;
}

function *getConversationId(userId, windowId) {
    return yield redis.hget('window:' + userId + ':' + windowId, 'conversationId');
}
