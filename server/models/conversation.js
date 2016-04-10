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

const assert = require('assert'),
      uuid = require('uid2'),
      redis = require('../lib/redis').createClient(),
      log = require('../lib/log'),
      search = require('../lib/search'),
      notification = require('../lib/notification'),
      window = require('../services/windows'),
      nick = require('./nick');

let MSG_BUFFER_SIZE = 200; // TBD: This should come from session:max_backlog setting

exports.create = async function(options) {
    return await create(options);
};

exports.delete = async function(conversationId) {
    let conversation = await get(conversationId);
    await conversation._remove();
};

exports.get = async function(conversationId) {
    return await get(conversationId);
};

exports.getAllIncludingUser = async function(userId) {
    // conversationlist structure must be maintained. Getting this information from windowlist would
    // work only for MAS users, not for external (IRC) users
    let conversations = [];
    let conversationIds = (await redis.smembers(`conversationlist:${userId}`)) || [];

    for (let conversationId of conversationIds) {
        conversations.push(await get(conversationId));
    }

    return conversations;
};

exports.findGroup = async function(name, network) {
    assert(network && name);

    let conversationId = await redis.hget(
        'index:conversation', 'group:' + network + ':' + name.toLowerCase());

    if (!conversationId) {
        log.info('Searched non-existing group: ' + network + ':' + name);
        return null;
    }

    return await get(conversationId);
};

exports.findOrCreate1on1 = async function(userId, peerUserId, network) {
    assert(userId && peerUserId && network);

    let conversation;
    let userIds = [ userId, peerUserId ].sort();
    let conversationId = await redis.hget('index:conversation',
        '1on1:' + network + ':' + userIds[0] + ':' + userIds[1]);

    // TBD: Make sure peerUserId is either valid MAS user or that user doesn't have too many
    // 1on1 conversations.

    if (!conversationId) {
        conversation = await create({
            owner: userId,
            type: '1on1',
            name: '',
            network: network
        });

        await conversation.set1on1Members(userId, peerUserId);
    } else {
        conversation = await get(conversationId);
    }

    return conversation;
};

function Conversation(conversationId, record, members) {
    this.conversationId = conversationId;

    Object.keys(record).forEach(function(prop) {
        this[prop] = record[prop];
    }.bind(this));

    this.members = members;

    return this;
}

Conversation.prototype.getMemberRole = async function(userId) {
    return this.members[userId];
};

Conversation.prototype.setMemberRole = async function(userId, role) {
    await this._setMember(userId, role);
    await this._streamAddMembers(userId, role);
};

Conversation.prototype.getPeerUserId = async function(userId) {
    let members = Object.keys(this.members);
    return members[0] === userId ? members[1] : members[0];
};

Conversation.prototype.set1on1Members = async function(userId, peerUserId) {
    let userIds = [ userId, peerUserId ].sort();
    let userHash = {};

    userHash[userId] = 'u';
    userHash[peerUserId] = 'u';

    await this._insertMembers(userHash);

    // Update 1on1 index
    await redis.hset('index:conversation',
        '1on1:' + this.network + ':' + userIds[0] + ':' + userIds[1], this.conversationId);

    // Update 1on1 conversation history
    if (userId.charAt(0) === 'm') {
        await redis.sadd(`1on1conversationhistory:${userId}`, this.conversationId);
    }

    if (peerUserId.charAt(0) === 'm') {
        await redis.sadd(`1on1conversationhistory:${peerUserId}`, this.conversationId);
    }
};

Conversation.prototype.setGroupMembers = async function(members) {
    let oldMembers = Object.keys(this.members);

    for (let userId of oldMembers) {
        if (members && !members[userId]) {
            await this.removeGroupMember(userId, true);
        }
    }

    await this._insertMembers(members);

    let newMembers = Object.keys(members);

    for (let userId of newMembers) {
        if (userId.charAt(0) === 'm') {
            await this.sendAddMembers(userId);
        }
    }
};

Conversation.prototype.addGroupMember = async function(userId, role) {
    assert(role === 'u' || role === '+' || role === '@' || role === '*');

    let newField = await this._setMember(userId, role);

    if (newField) {
        await this.addMessage({
            userId: userId,
            cat: 'join',
            body: ''
        });

        await this._streamAddMembers(userId, role);
    }
};

Conversation.prototype.removeGroupMember = async function(userId, skipCleanUp, wasKicked, reason) {
    assert(this.type === 'group');

    let removed = await redis.hdel(`conversationmembers:${this.conversationId}`, userId);
    await redis.srem(`conversationlist:${userId}`, this.conversationId);

    if (removed === 1) {
        log.info(`User: ${userId} removed from conversation: ${this.conversationId}`);

        delete this.members[userId];

        await this.addMessage({
            userId: userId,
            cat: wasKicked ? 'kick' : 'part',
            body: wasKicked && reason ? reason : ''
        });

        await this._streamRemoveMembers(userId);

        // Never let window to exist alone without linked conversation
        await this._removeConversationWindow(userId);

        let removeConversation = true;

        Object.keys(this.members).forEach(function(member) {
            if (member.charAt(0) === 'm') {
                removeConversation = false;
            }
        });

        if (removeConversation && !skipCleanUp) {
            log.info(userId,
                'Last member parted, removing conversation, id: ' + this.conversationId);
            await this._remove(this);
        }
    }
};

Conversation.prototype.remove1on1Member = async function(userId) {
    assert(this.members[userId]);

    // Never let window to exist alone without linked conversation
    await this._removeConversationWindow(userId);

    // No clean-up is currently needed. 1on1 discussions are never deleted. Group discussions
    // are deleted when the last member parts. This makes sense as groups are then totally reseted
    // when they become empty (TBD: except elasticsearch contains orphan logs). Never deleting
    // 1on1 conversations makes log searching from elasticsearch possible. TBD: On the other hand
    // dead 1on1s start to pile eventually on Redis.
};

Conversation.prototype.isMember = async function(userId) {
    return !!this.members[userId];
};

Conversation.prototype.addMessage = async function(msg, excludeSession) {
    msg.gid = await redis.incr('nextGlobalMsgId');
    msg.ts = Math.round(Date.now() / 1000);

    await this._scanForEmailNotifications(msg);

    await redis.lpush(`conversationmsgs:${this.conversationId}`, JSON.stringify(msg));
    await redis.ltrim(`conversationmsgs:${this.conversationId}`, 0, MSG_BUFFER_SIZE - 1);

    await this._streamMsg(msg, excludeSession);

    search.storeMessage(this.conversationId, msg);

    return msg;
};

Conversation.prototype.addMessageUnlessDuplicate = async function(sourceUserId, msg, excludeSession) {
    // A special filter for IRC backend.

    // To support Flowdock network where MAS user's message can come from the IRC server
    // (before all incoming messages from MAS users were ignored as delivery had happened
    // already locally) the overall logic is complicated. The code in the lua method now
    // works because IRC server doesn't echo messages back to their senders. If that wasn't
    // the case, lua reporter logic would fail. (If a reporter sees a new identical message
    // it's not considered as duplicate. Somebody is just repeating their line.)
    let duplicate = await redis.run('duplicateMsgFilter', sourceUserId, this.conversationId,
        msg.userId, msg.body);

    if (!duplicate) {
        return await this.addMessage(msg, excludeSession);
    }

    return {};
};

Conversation.prototype.editMessage = async function(userId, gid, text) {
    let ts = Math.round(Date.now() / 1000);

    let result = await redis.run('editMessage', this.conversationId, gid, userId, text, ts);

    if (!result) {
        return false;
    }

    let msg = JSON.parse(result);
    msg.id = 'MSG';

    await this._streamMsg(msg);

    return true;
};

Conversation.prototype.sendAddMembers = async function(userId) {
    let windowId = await window.findByConversationId(userId, this.conversationId);
    let membersList = [];

    Object.keys(this.members).forEach(function(key) {
        membersList.push({
            userId: key,
            role: this.members[key]
        });
    }.bind(this));

    await notification.broadcast(userId, {
        id: 'ADDMEMBERS',
        windowId: parseInt(windowId),
        reset: true,
        members: membersList
    });
};

Conversation.prototype.sendUsers = async function(userId) {
    let userIds = Object.keys(this.members);

    for (let masUserId of userIds) {
        await redis.run('introduceNewUserIds', masUserId, null, null, true, userId);
    }
};

Conversation.prototype.setTopic = async function(topic, nickName) {
    let changed = await redis.run('setConversationField', this.conversationId, 'topic', topic);

    if (!changed) {
        return;
    }

    this.topic = topic;

    await this._stream({
        id: 'UPDATE',
        topic: topic
    });

    await this.addMessage({
        cat: 'info',
        body: nickName + ' has changed the topic to: "' + topic + '".'
    });
};

Conversation.prototype.setPassword = async function(password) {
    let changed = await redis.run(
        'setConversationField', this.conversationId, 'password', password);

    if (!changed) {
        return;
    }

    this.password = password;

    await this._stream({
        id: 'UPDATE',
        password: password
    });

    let text = password === '' ?
        'Password protection has been removed from this channel.' :
        'The password for this channel has been changed to ' + password + '.';

    await this.addMessage({
        cat: 'info',
        body: text
    });
};

Conversation.prototype._streamMsg = async function(msg, excludeSession) {
    msg.id = 'MSG';
    await this._stream(msg, excludeSession);
};

Conversation.prototype._streamAddMembers = async function(userId, role) {
    await this._stream({
        id: 'ADDMEMBERS',
        reset: false,
        members: [ {
            userId: userId,
            role: role
        } ]
    });
};

Conversation.prototype._streamRemoveMembers = async function(userId) {
    await this._stream({
        id: 'DELMEMBERS',
        members: [ {
            userId: userId
        } ]
    });
};

Conversation.prototype._stream = async function(msg, excludeSession) {
    let members = Object.keys(this.members);

    for (let userId of members) {
        if (userId.charAt(0) !== 'm') {
            continue;
        }

        let windowId = await window.findByConversationId(userId, this.conversationId);

        if (!windowId && msg.id === 'MSG' && this.type === '1on1') {
            // The case where one of the 1on1 members has closed his window
            windowId = await window.create(userId, this.conversationId);
        }

        if (!windowId) {
            log.warn(userId, 'Window doesn\'t exist, can\'t stream ntf:' + JSON.stringify(msg));
            return;
        }

        msg.windowId = parseInt(windowId);

        await notification.broadcast(userId, msg, excludeSession);
    }
};

Conversation.prototype._insertMembers = async function(members) {
    assert(members);

    for (let userId of Object.keys(members)) {
        this.members[userId] = members[userId];
        await redis.sadd(`conversationlist:${userId}`, this.conversationId);
    }

    await redis.hmset(`conversationmembers:${this.conversationId}`, members);
};

Conversation.prototype._remove = async function() {
    await redis.del(`conversation:${this.conversationId}`);
    await redis.del(`conversationmsgs:${this.conversationId}`);
    await this._removeAllMembers();

    let key;

    if (this.type === 'group') {
        key = 'group:' + this.network + ':' + this.name.toLowerCase();
    } else {
        let userIds = Object.keys(this.members);
        userIds = userIds.sort();
        key = '1on1:' + this.network + ':' + userIds[0] + ':' + userIds[1];
    }

    let removed = await redis.hdel('index:conversation', key);

    if (removed !== 1) {
        log.warn(`Tried to remove index:conversation entry that doesn\'t exist, key: ${key}`);
    }
};

Conversation.prototype._removeAllMembers = async function() {
    let members = Object.keys(this.members);

    for (let userId of members) {
        await redis.srem(`conversationlist:${userId}`, this.conversationId);
    }

    this.members = {};
    await redis.del(`conversationmembers:${this.conversationId}`);
};

Conversation.prototype._removeConversationWindow = async function(userId) {
    if (userId.charAt(0) === 'm') {
        await window.removeByConversationId(userId, this.conversationId);
    }
};

Conversation.prototype._setMember = async function(userId, role) {
    this.members[userId] = role;
    let newField = await redis.hset(`conversationmembers:${this.conversationId}`, userId, role);

    if (newField) {
        await redis.sadd(`conversationlist:${userId}`, this.conversationId);
    }

    return newField;
};

Conversation.prototype._scanForEmailNotifications = async function(message) {
    if (message.userId === 'iSERVER') {
        return;
    }

    let userIds = [];

    if (this.type === 'group') {
        let mentions = message.body.match(/(?:^| )@\S+(?=$| )/g);

        if (!mentions) {
            return;
        }

        for (let mention of mentions) {
            let userId = await nick.getUserIdFromNick(mention.substring(1), this.network);

            if (userId) {
                userIds.push(userId);
            }
        }

        if (userIds.length === 0) {
            return;
        }
    } else {
        userIds = [ await this.getPeerUserId(message.userId) ];
    }

    for (let userId of userIds) {
        let user = await redis.hgetall(`user:${userId}`);

        if (!user || parseInt(user.lastlogout) === 0) {
            continue; // Mentioned user is IRC user or online
        }

        let windowId = await window.findByConversationId(userId, this.conversationId);

        if (!windowId) {
            continue; // Mentioned user is not on this group
        }

        let emailAlertSetting = await redis.hget(`window:${userId}:${windowId}`, 'emailAlert');

        if (emailAlertSetting === 'true') {
            let nickName = await nick.getCurrentNick(message.userId, this.network);
            let name = (await redis.hget(`user:${message.userId}`, 'name')) || nickName;
            let notificationId = uuid(20);

            // TBD: Needs to be transaction, add lua script
            await redis.sadd('emailnotifications', userId);
            await redis.lpush(`emailnotificationslist:${userId}`, notificationId);

            await redis.hmset(`emailnotification:${notificationId}`, {
                type: this.type,
                senderName: name,
                senderNick: nickName,
                groupName: this.name,
                message: message.body
            });
        }
    }
};

async function create(options) {
    let conversationId = await redis.incr('nextGlobalConversationId');

    Object.keys(options).forEach(function(prop) {
        // Can't store null to redis
        options[prop] = options[prop] === null ? '' : options[prop];
    });

    await redis.hmset(`conversation:${conversationId}`, options);

    if (options.type === 'group') {
        // Update group index
        await redis.hset('index:conversation',
            'group:' + options.network + ':' + options.name.toLowerCase(), conversationId);
    }

    log.info('Created ' + options.type + ' conversation: ' + conversationId +
        (options.name ? ', name: ' + options.name : '') + ' (' + options.network + ')');

    return new Conversation(conversationId, options, {});
}

async function get(conversationId) {
    let record = await redis.hgetall(`conversation:${conversationId}`);
    let members = await redis.hgetall(`conversationmembers:${conversationId}`);

    if (record) {
        return new Conversation(conversationId, record, members || {});
    } else {
        log.warn(`Searched non-existing conversation, id: ${conversationId}`);
        return null;
    }
}
