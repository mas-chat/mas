//
//   Copyright 2014 Ilkka Oksanen <iao@iki.fi>
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
    log = require('./log'),
    outbox = require('./outbox');

var roleMap = {
    OWNER: '*',
    OPER: '@',
    VOICE: '+',
    USER: 'u'
};

var MSG_BUFFER_SIZE = 200;

// TBD: split to conversation.js and conversationMembers.js

exports.create = function*(options) {
    var conversationId = yield redis.incr('nextGlobalConversationId');

    yield redis.hmset('conversation:' + conversationId, options);

    if (options.type === 'group') {
        // Update group index
        yield redis.hset('index:conversation',
            'group:' + options.network + ':' + options.name, conversationId);
    }

    log.info('Created conversation: ' + conversationId);
    return conversationId;
};

exports.get = function*(conversationId) {
    return yield redis.hgetall('conversation:' + conversationId);
};

exports.findGroup = function*(name, network) {
    var conversationId = yield redis.hget('index:conversation', 'group:' + network + ':' + name);
    return conversationId;
};

exports.find1on1 = function*(userId1, userId2, network) {
    var userIds = [ userId1, userId2 ].sort();
    var conversationId = yield redis.hget('index:conversation',
        '1on1:' + network + ':' + userIds[0] + ':' + userIds[1]);

    return conversationId;
};

exports.set1on1Members = function*(conversationId, userId1, userId2) {
    var network = yield redis.hget('conversation:' + conversationId, 'network');
    var userIds = [ userId1, userId2 ].sort();

    yield insertMember(conversationId, userId1, 'USER');
    yield insertMember(conversationId, userId2, 'USER');

    // Update 1on1 index
    yield redis.hset('index:conversation',
        '1on1:' + network + ':' + userIds[0] + ':' + userIds[1], conversationId);
};

exports.addGroupMember = function*(conversationId, userId, role) {
    yield addMessage(conversationId, 0, {
        body: userId + ' joined.',
        cat: 'join'
    });

    yield streamAddMembers(conversationId, userId, role);
    yield insertMember(conversationId, userId, role); // Must be last
};

exports.removeGroupMember = function*(conversationId, userId) {
    yield addMessage(conversationId, 0, {
        body: userId + ' parted.',
        cat: 'part'
    });

    yield streamRemoveMembers(conversationId, userId);
    yield removeMember(conversationId, userId);
};

exports.addMessage = function*(conversationId, excludeSession, msg) {
    yield addMessage(conversationId, excludeSession, msg);
};

exports.sendAddMembers = function*(userId, conversationId) {
    var members = yield redis.hgetall('conversationmembers:' + conversationId);
    var membersList = [];

    Object.keys(members).forEach(function(key) {
        membersList.push({
            userId: key,
            role: members[key]
        });
    });

    yield stream(conversationId, 0, {
        id: 'ADDMEMBERS',
        reset: true,
        members: membersList
    });
};

function *addMessage(conversationId, excludeSession, msg) {
    msg.gid = yield redis.incr('nextGlobalMsgId');
    msg.ts = Math.round(Date.now() / 1000);

    yield redis.lpush('conversationmsgs:' + conversationId, JSON.stringify(msg));
    yield redis.ltrim('conversationmsgs:' + conversationId, 0, MSG_BUFFER_SIZE - 1);

    yield streamAddText(conversationId, excludeSession, msg);
}

function *streamAddText(conversationId, excludeSession, msg) {
    msg.id = 'ADDTEXT';
    yield stream(conversationId, excludeSession, msg);
}

function *streamAddMembers(conversationId, userId, role) {
    yield stream(conversationId, 0, {
        id: 'ADDMEMBERS',
        reset: false,
        members: [ {
            userId: userId,
            role: role
        } ]
    });
}

function *streamRemoveMembers(conversationId, userId) {
    yield stream(conversationId, 0, {
        id: 'DELMEMBERS',
        members: [ {
            userId: userId
        } ]
    });
}

function *stream(conversationId, excludeSession, msg) {
    var members = yield getMembers(conversationId);

    for (var i = 0; i < members.length; i++) {
        var windowId = yield redis.hget('index:windowIds', members[i] + ':' + conversationId);
        msg.windowId = parseInt(windowId);

        yield outbox.queueAll(members[i], msg);
    }
}

function *insertMember(conversationId, userId, role) {
    yield redis.hset('conversationmembers:' + conversationId, userId, roleMap[role]);
}

function *removeMember(conversationId, userId) {
    yield redis.hdel('conversationmembers:' + conversationId, userId);
}

function *getMembers(conversationId) {
    return yield redis.hkeys('conversationmembers:' + conversationId);
}
