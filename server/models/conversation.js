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

let assert = require('assert'),
    redis = require('../lib/redis').createClient(),
    log = require('../lib/log'),
    outbox = require('../lib/outbox'),
    window = require('./window');

let MSG_BUFFER_SIZE = 200;

exports.create = function*(options) {
    let conversationId = yield redis.incr('nextGlobalConversationId');

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

    log.info('Created ' + options.type + ' conversation: ' + conversationId +
        (options.name ? ', name: ' + options.name : '') + ' (' + options.network + ')');

    return new Conversation(conversationId, options, {});
};

exports.get = function*(conversationId) {
    return yield get(conversationId);
};

exports.findGroup = function*(name, network) {
    assert(network && name);

    let conversationId = yield redis.hget('index:conversation', 'group:' + network + ':' + name);

    if (!conversationId) {
        log.info('Searched non-existing group: ' + network + ':' + name);
    }

    return yield get(conversationId);
};

exports.find1on1 = function*(userId1, userId2, network) {
    assert (userId1 && userId2 && network);

    let userIds = [ userId1, userId2 ].sort();
    let conversationId = yield redis.hget('index:conversation',
        '1on1:' + network + ':' + userIds[0] + ':' + userIds[1]);

    if (!conversationId) {
        log.info('Searched non-existing 1on1: ' + userId1 + ':' + userId2 + ':' + network);
    }

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
    yield this._streamAddMembers(userId, role);
};

Conversation.prototype.getPeerUserId = function*(userId) {
    /* jshint noyield:true */
    let members = Object.keys(this.members);
    return members[0] === userId ? members[1] : members[0];
};

Conversation.prototype.set1on1Members = function*(userId, peerUserId) {
    let userIds = [ userId, peerUserId ].sort();
    let userHash = {};

    userHash[userId] = 'u';
    userHash[peerUserId] = 'd';

    yield this._insertMembers(userHash);

    // Update 1on1 index
    yield redis.hset('index:conversation',
        '1on1:' + this.network + ':' + userIds[0] + ':' + userIds[1], this.conversationId);
};

Conversation.prototype.setGroupMembers = function*(members) {
    let oldMembers = Object.keys(this.members);

    for (var i = 0; i < oldMembers.length; i++) {
        if (members && !members[oldMembers[i]]) {
            yield this.removeGroupMember(oldMembers[i], true);
        }
    }

    yield this._insertMembers(members);

    let newMembers = Object.keys(members);

    for (i = 0; i < newMembers.length; i++) {
        if (newMembers[i].charAt(0) === 'm') {
            yield this.sendAddMembers(newMembers[i]);
        }
    }
};

Conversation.prototype.addGroupMember = function*(userId, role) {
    assert(role === 'u' || role === '+' || role === '@' || role === '*');

    let newField = yield redis.hset('conversationmembers:' + this.conversationId, userId, role);

    if (newField) {
        this.members[userId] = role;

        yield this.addMessage({
            userId: userId,
            cat: 'join',
            body: ''
        });

        yield this._streamAddMembers(userId, role);
    }
};

Conversation.prototype.removeGroupMember = function*(userId, skipCleanUp, wasKicked, reason) {
    assert(this.type === 'group');

    let removed = yield redis.hdel('conversationmembers:' + this.conversationId, userId);

    if (removed === 1) {
        log.info('User: ' + userId + ' removed from conversation: ' +  this.conversationId);

        delete this.members[userId];

        yield this.addMessage({
            userId: userId,
            cat: wasKicked ? 'kick' : 'part',
            body: wasKicked && reason ? reason : ''
        });

        yield this._streamRemoveMembers(userId);

        let removeConversation = true;

        if (userId.charAt(0) === 'm') {
            // Never let window to exist alone without linked conversation
            yield window.removeByConversationId(userId, this.conversationId);
        }

        Object.keys(this.members).forEach(function(member) {
            if (member.charAt(0) === 'm') {
                removeConversation = false;
            }
        });

        if (removeConversation && !skipCleanUp) {
            log.info(userId,
                'Last member parted, removing conversation, id: ' + this.conversationId);
            yield this._remove(this);
        }
    }
};

Conversation.prototype.remove1on1Member = function*(userId) {
    // First user that quits 1on1 is 'soft' removed, i.e. marked as having 'd'(etached) role
    this.members[userId] = 'd';
    yield redis.hset('conversationmembers:' + this.conversationId, userId, 'd');

    let peerUserId = yield this.getPeerUserId(this, userId);

    if (this.members[peerUserId] === 'd' || peerUserId.charAt(0) !== 'm') {
        yield this._remove();
    }
};

Conversation.prototype.isMember = function*(userId) {
    /* jshint noyield:true */
    return !!this.members[userId];
};

Conversation.prototype.addMessage = function*(msg, excludeSession) {
    msg.gid = yield redis.incr('nextGlobalMsgId');
    msg.ts = Math.round(Date.now() / 1000);

    yield redis.lpush('conversationmsgs:' + this.conversationId, JSON.stringify(msg));
    yield redis.ltrim('conversationmsgs:' + this.conversationId, 0, MSG_BUFFER_SIZE - 1);

    yield this._streamAddText(msg, excludeSession);
};

Conversation.prototype.addMessageUnlessDuplicate = function*(sourceUserId, msg, excludeSession) {
    // A special filter for IRC backend
    let duplicate = yield redis.run('duplicateMsgFilter', sourceUserId, this.conversationId, msg);

    if (!duplicate) {
        yield this.addMessage(msg, excludeSession);
    }
};

Conversation.prototype.sendAddMembers = function*(userId) {
    let windowId = yield window.findByConversationId(userId, this.conversationId);
    let membersList = [];

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

Conversation.prototype.sendUsers = function*(userId) {
    let userIds = Object.keys(this.members);

    for (var i = 0; i < userIds.length; i++) {
        yield redis.run('introduceNewUserIds', userIds[i], null, null, true, userId);
    }
};

Conversation.prototype.setTopic = function*(topic, nick) {
    let changed = yield redis.run('setConversationField', this.conversationId, 'topic', topic);

    if (!changed) {
        return;
    }

    this.topic = topic;

    yield this._stream({
        id: 'UPDATE',
        topic: topic
    });

    yield this.addMessage({
        cat: 'info',
        body: nick + ' has changed the topic to: "' + topic + '".'
    });
};

Conversation.prototype.setPassword = function*(password) {
    let changed = yield redis.run(
        'setConversationField', this.conversationId, 'password', password);

    if (!changed) {
        return;
    }

    this.password = password;

    yield this._stream({
        id: 'UPDATE',
        password: password
    });

    let text = password === '' ?
        'Password protection has been removed from this channel.' :
        'The password for this channel has been changed to ' + password + '.';

    yield this.addMessage({
        cat: 'info',
        body: text
    });
};

Conversation.prototype._streamAddText = function*(msg, excludeSession) {
    msg.id = 'ADDTEXT';
    yield this._stream(msg, excludeSession);
};

Conversation.prototype._streamAddMembers = function*(userId, role) {
    yield this._stream({
        id: 'ADDMEMBERS',
        reset: false,
        members: [ {
            userId: userId,
            role: role
        } ]
    });
};

Conversation.prototype._streamRemoveMembers = function*(userId) {
    yield this._stream({
        id: 'DELMEMBERS',
        members: [ {
            userId: userId
        } ]
    });
};

Conversation.prototype._stream = function*(msg, excludeSession) {
    let members = Object.keys(this.members);

    for (var i = 0; i < members.length; i++) {
        if (members[i].charAt(0) !== 'm') {
            continue;
        }

        let windowId = yield window.findByConversationId(members[i], this.conversationId);

        if (!windowId && this.type === '1on1') {
            // The case where one of the 1on1 members has closed his window and has 'd' role
            assert((yield this.getMemberRole(members[i])) === 'd');
            windowId = yield window.create(members[i], this.conversationId);
            yield this.setMemberRole(members[i], 'u');
        }

        msg.windowId = parseInt(windowId);

        yield outbox.queueAll(members[i], msg, excludeSession);
    }
};

Conversation.prototype._insertMembers = function*(members) {
    assert(members);

    Object.keys(members).forEach(function(prop) {
        this.members[prop] = members[prop];
    }.bind(this));

    yield redis.hmset('conversationmembers:' + this.conversationId, members);
};

Conversation.prototype._remove = function*() {
    yield redis.del('conversation:' + this.conversationId);
    yield redis.del('conversationmembers:' + this.conversationId);
    yield redis.del('conversationmsgs:' + this.conversationId);

    let key;

    if (this.type === 'group') {
        key = 'group:' + this.network + ':' + this.name;
    } else {
        let userIds = Object.keys(this.members);
        userIds = userIds.sort();
        key = '1on1:' + this.network + ':' + userIds[0] + ':' + userIds[1];
    }

    yield redis.hdel('index:conversation', key);
};

function *get(conversationId) {
    let record =  yield redis.hgetall('conversation:' + conversationId);
    let members = yield redis.hgetall('conversationmembers:' + conversationId);

    return record ? new Conversation(conversationId, record, members || {}) : null;
}
