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

/* jshint -W079 */

var assert = require('assert'),
    redis = require('../lib/redis').createClient(),
    log = require('../lib/log'),
    outbox = require('../lib/outbox'),
    window = require('./window');

var MSG_BUFFER_SIZE = 200;

exports.create = function*(options) {
    var conversationId = yield redis.incr('nextGlobalConversationId');

    Object.keys(options).forEach(function(prop) {
        // Can't store null to redis
        options[prop] = options[prop] === null ? '' : options[prop];
    });

    yield redis.hmset('conversation:' + conversationId, options);

    if (options.type === 'group') {
        // Update group index
        yield redis.hset('index:conversation',
            'group:' + options.network + ':' + options.name, conversationId);
    }

    log.info('Created conversation: ' + conversationId);
    return new Conversation(conversationId, options, {});
};

exports.get = function*(conversationId) {
    return yield get(conversationId);
};

exports.findGroup = function*(name, network) {
    log.info('Searching group: ' + network + ':' + name);
    var conversationId = yield redis.hget('index:conversation', 'group:' + network + ':' + name);
    return yield get(conversationId);
};

exports.find1on1 = function*(userId1, userId2, network) {
    log.info('Searching 1on1: ' + userId1 + ':' + userId2 + ':' + network);

    var userIds = [ userId1, userId2 ].sort();
    var conversationId = yield redis.hget('index:conversation',
        '1on1:' + network + ':' + userIds[0] + ':' + userIds[1]);

    return yield get(conversationId);
};

function Conversation(conversationId, record, members) {
    this.conversationId = conversationId;

    Object.keys(record).forEach(function(prop) {
        this[prop] = record[prop];
    }.bind(this));

    this.members = members;

    return this;
}

Conversation.prototype.getMemberRole = function*(userId) {
    /* jshint noyield:true */
    return this.members[userId];
};

Conversation.prototype.setMemberRole = function*(userId, role) {
    this.members[userId] = role;

    yield redis.hset('conversationmembers:' + this.conversationId, userId, role);
    yield streamAddMembers(this.conversationId, userId, role);
};

Conversation.prototype.getPeerUserId = function*(userId) {
    var members = yield getMembers(this.conversationId);
    return members[0] === userId ? members[1] : members[0];
};

Conversation.prototype.set1on1Members = function*(userId1, userId2) {
    var network = yield redis.hget('conversation:' + this.conversationId, 'network');
    var userIds = [ userId1, userId2 ].sort();

    this.members = {};
    this.members[userId1] = 'u';
    this.members[userId2] = 'u';

    yield insertMember(this.conversationId, userId1, 'u');
    yield insertMember(this.conversationId, userId2, 'u');

    // Update 1on1 index
    yield redis.hset('index:conversation',
        '1on1:' + network + ':' + userIds[0] + ':' + userIds[1], this.conversationId);
};

Conversation.prototype.setGroupMembers = function*(members, reset) {
    if (reset) {
        yield redis.del('conversationmembers:' + this.conversationId);
        this.members = {};
    }

    Object.keys(members).forEach(function(prop) {
        this.members[prop] = members[prop];
    });

    yield insertMembers(this.conversationId, members);
};

Conversation.prototype.addGroupMember = function*(userId, role) {
    assert (role === 'u' || role === '+' || role === '@' || role === '*');
    this.members[userId] = role;

    yield insertMember(this.conversationId, userId, role);

    yield addMessage(this.conversationId, 0, {
        userId: userId,
        cat: 'join',
        body: ''
    });

    yield streamAddMembers(this.conversationId, userId, role);
};

Conversation.prototype.removeGroupMember = function*(userId) {
    delete this.members[userId];

    yield addMessage(this.conversationId, 0, {
        userId: userId,
        cat: 'part',
        body: ''
    });

    yield streamRemoveMembers(this.conversationId, userId);
    yield removeMember(this.conversationId, userId);

    var removeConversation = true;

    Object.keys(this.members).forEach(function(member) {
        if (member.charAt(0) === 'm') {
            removeConversation = false;
        }
    });

    if (removeConversation) {
        log.info(userId,
            'Last member parted, removing conversation, conversationId: ' + this.conversationId);
        yield remove(this.conversationId, this);
    }
};

Conversation.prototype.isMember = function*(userId) {
    /* jshint noyield:true */
    return !!this.members[userId];
};

Conversation.prototype.addMessage = function*(msg, excludeSession) {
    yield addMessage(this.conversationId, excludeSession, msg);
};

Conversation.prototype.sendAddMembers = function*(userId) {
    var windowId = yield window.findByConversationId(userId, this.conversationId);
    var membersList = [];

    Object.keys(this.members).forEach(function(key) {
        membersList.push({
            userId: key,
            role: this.members[key]
        });
    }.bind(this));

    yield outbox.queueAll(userId, {
        id: 'ADDMEMBERS',
        windowId: parseInt(windowId),
        reset: true,
        members: membersList
    });
};

Conversation.prototype.setTopic = function*(topic) {
    yield redis.hset('conversation:' + this.conversationId, 'topic', topic);

    yield stream(this.conversationId, 0, {
        id: 'UPDATE',
        topic: topic
    });
};

Conversation.prototype.setPassword = function*(password) {
    yield redis.hset('conversation:' + this.conversationId, 'password', password);

    yield stream(this.conversationId, 0, {
        id: 'UPDATE',
        password: password
    });

    var text = password === '' ?
        'Password protection has been removed from this channel.' :
        'The password for this channel has been changed to ' + password + '.';

    yield addMessage(this.conversationId, 0, {
        cat: 'info',
        body: text
    });
};

function *get(conversationId) {
    var record =  yield redis.hgetall('conversation:' + conversationId);
    var members = yield redis.hgetall('conversationmembers:' + conversationId);

    return record ? new Conversation(conversationId, record, members) : null;
}

function *remove(conversationId, conversation) {
    yield redis.del('conversation:' + conversationId);
    yield redis.del('conversationmembers:' + conversationId);
    yield redis.del('conversationmsgs:' + conversationId);

    var key;

    if (conversation.type === 'group') {
        key = 'group:' + conversation.network + ':' + conversation.name;
    } else {
        var userIds = yield getMembers(conversationId);
        userIds = userIds.sort();
        key = '1on1:' + conversation.network + ':' + userIds[0] + ':' + userIds[1];
    }

    yield redis.hdel('index:conversation', key);
}

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
        var windowId = yield window.findByConversationId(members[i], conversationId);
        msg.windowId = parseInt(windowId);

        yield outbox.queueAll(members[i], msg, excludeSession);
    }
}

function *insertMember(conversationId, userId, role) {
    var hash = {};
    hash[userId] = role;

    yield insertMembers(conversationId, hash);
}

function *insertMembers(conversationId, members) {
    yield redis.hmset('conversationmembers:' + conversationId, members);
}

function *removeMember(conversationId, userId) {
    yield redis.hdel('conversationmembers:' + conversationId, userId);
}

function *getMembers(conversationId) {
    return yield redis.hkeys('conversationmembers:' + conversationId);
}
