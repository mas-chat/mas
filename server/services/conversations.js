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

const assert = require('assert');
const uuid = require('uid2');
const redis = require('../lib/redis').createClient();
const log = require('../lib/log');
const search = require('../lib/search');
const notification = require('../lib/notification');
const User = require('../models/user');
const Window = require('../models/window');
const Conversation = require('../models/conversation');
const ConversationMember = require('../models/conversationMember');
const ConversationMessage = require('../models/conversationMessage');
const UserGId = require('../models/userGId');
const windowsService = require('../services/windows');
const nicksService = require('../services/nicks');

const MSG_BUFFER_SIZE = 200; // TODO: This should come from session:max_backlog setting

exports.findOrCreate1on1 = async function findOrCreate1on1(user, peerUserGId, network) {
    assert(user && peerUserGId && network);

    let conversation = null;
    const userMembers = await ConversationMember.find({ userGId: user.gIdString });
    const peerMembers = await ConversationMember.find({ userGId: peerUserGId.toString() });

    // Figure out 1on1 conversations where both users are members
    const commonMembers = userMembers.filter(
        member => peerMembers.find(
            peer => peer.get('conversationId') === member.get('conversationId')));

    for (const commonMember of commonMembers) {
        const candidateConversation = await Conversation.fetch(commonMember.get('conversationId'));

        if (candidateConversation.get('type') === '1on1') {
            conversation = candidateConversation;
            break;
        }
    }

    // TODO: Make sure peerUserId is either valid MAS user or that user doesn't have too many
    // 1on1 conversations.

    if (!conversation) {
        conversation = await Conversation.create({
            owner: user.id,
            type: '1on1',
            name: null,
            network
        });

        await ConversationMember.create({
            conversationId: conversation.id,
            userGId: user.gIdString,
            role: 'u'
        });

        await ConversationMember.create({
            conversationId: conversation.id,
            userGId: peerUserGId.toString(),
            role: 'u'
        });

        // Update 1on1 conversation histories
        await redis.sadd(`1on1conversationhistory:${user.gid}`, conversation.id);

        if (peerUserGId.type === 'mas') {
            await redis.sadd(`1on1conversationhistory:${peerUserGId}`, conversation.id);
        }
    }

    return conversation;
};

exports.delete = async function deleteCoversation(conversation) {
    return await remove(conversation);
};

exports.getPeerMember = async function getPeerMember(conversation, userGId) {
    return await get1on1PeerMember(conversation, userGId);
};

exports.getMemberRole = async function getMemberRole(conversation, userGId) {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    const targetMember = members.find(member =>
        UserGId.create(member.get('userGId')).equals(userGId));

    return targetMember ? targetMember.get('role') : null;
};

exports.setMemberRole = async function setMemberRole(conversation, userGId, role) {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    const targetMember = members.find(member =>
        UserGId.create(member.get('userGId')).equals(userGId));

    if (targetMember) {
        await targetMember.set({ role });
        await broadcastAddMembers(conversation, userGId, role);
    }
};

exports.setGroupMembers = async function setGroupMembers(conversation, newMembersHash) {
    const oldMembers = await ConversationMember.find({ conversationId: conversation.id });

    for (const oldMember of oldMembers) {
        if (!Object.keys(newMembersHash).some(newMember => newMember === oldMember.gIdString)) {
            await deleteConversationMember(conversation, oldMember, { skipCleanUp: true });
        }
    }

    for (const newMember of Object.keys(newMembersHash)) {
        if (!oldMembers.some(oldMember => oldMember.gIdString === newMember)) {
            await ConversationMember.create({
                conversationId: conversation.id,
                userGId: newMember,
                role: newMembersHash[newMember]
            });
        }
    }

    for (const newMember of Object.keys(newMembersHash)) {
        const newMemberGId = UserGId.create(newMember);

        if (newMemberGId.isMASUser) {
            const user = await User.fetch(newMemberGId.id);
            await sendCompleteAddMembers(conversation, user);
        }
    }
};

exports.addGroupMember = async function addGroupMember(conversation, userGId, role, options = {}) {
    if (!(role === 'u' || role === '+' || role === '@' || role === '*')) {
        log.warn(`Unknown role ${role}, userGId: ${userGId}`);
    }

    const members = await ConversationMember.find({ conversationId: conversation.id });
    const targetMember = members.find(member => member.get('userGId') === userGId.toString());

    if (!targetMember) {
        await ConversationMember.create({
            conversationId: conversation.id,
            userGId: userGId.toString(),
            role
        });

        if (!options.silent) {
            await broadcastAddMessage(conversation, {
                userGId: userGId.toString(),
                cat: 'join',
                body: ''
            });
        }

        await broadcastAddMembers(conversation, userGId, role);
    } else {
        await targetMember.set({ role });
    }
};

exports.removeGroupMember = async function removeGroupMember(conversation, userGId, options = {}) {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    const targetMember = members.find(member => member.get('userGId') === userGId.toString());

    await deleteConversationMember(conversation, targetMember, options);
};

exports.remove1on1Member = async function remove1on1Member(conversation, userGId) {
    // Never let window to exist alone without linked conversation
    await removeConversationWindow(conversation, userGId);

    // No clean-up is currently needed. 1on1 discussions are never deleted. Group discussions
    // are deleted when the last member parts. This makes sense as groups are then totally reseted
    // when they become empty (TODO: except elasticsearch contains orphan logs). Never deleting
    // 1on1 conversations makes log searching from elasticsearch possible. TODO: On the other hand
    // dead 1on1s start to pile eventually on Redis.
};

exports.isMember = async function isMember(conversation, user) {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    return members.some(member => member.get('userGId') === user.gId);
};

exports.addMessageUnlessDuplicate = async function addMessageUnlessDuplicate(
    conversation, user, msg, excludeSession) {
    // A special filter for IRC backend.

    // To support Flowdock network where MAS user's message can come from the IRC server
    // (before all incoming messages from MAS users were ignored as delivery had happened
    // already locally) the overall logic is complicated. The code in the lua method now
    // works because IRC server doesn't echo messages back to their senders. If that wasn't
    // the case, lua reporter logic would fail. (If a reporter sees a new identical message
    // it's not considered as duplicate. Somebody is just repeating their line.)
    const duplicate = await redis.run('duplicateMsgFilter', user.gIdString, conversation.id,
        msg.userId, msg.body);

    if (!duplicate) {
        return await broadcastAddMessage(conversation, msg, excludeSession);
    }

    return {};
};

exports.addMessage = async function addMessage(conversation, msg, excludeSession) {
    return await broadcastAddMessage(conversation, msg, excludeSession);
};

exports.editMessage = async function editMessage(conversation, user, conversationMessageId, text) {
    const message = await ConversationMessage.fetch(conversationMessageId);

    if (!message) {
        return false;
    }

    const userGId = UserGId.create(message.get('userGId'));

    if (!userGId.equals(user.gId)) {
        return false;
    }

    await message.set('body', text);
    await message.set('updatedTs', new Date());
    await message.set('status', text === '' ? 'deleted' : 'edited');
    await message.set('updatedId', await ConversationMessage.currentId());

    await broadcast(conversation, message.convertToNtf());

    return true;
};

exports.sendFullAddMembers = async function sendFullAddMembers(conversation, user) {
    return await sendCompleteAddMembers(conversation, user);
};

exports.setTopic = async function setTopic(conversation, topic, nickName) {
    const changes = await conversation.set({ topic });

    if (changes === 0) {
        return;
    }

    await broadcast(conversation, { id: 'UPDATE', topic });

    await broadcastAddMessage(conversation, {
        cat: 'info',
        body: `${nickName} has changed the topic to: "${topic}".`
    });
};

exports.setPassword = async function setPassword(conversation, password) {
    const changes = await conversation.set({ password });

    if (changes === 0) {
        return;
    }

    await broadcast(conversation, {
        id: 'UPDATE',
        password
    });

    const text = password === '' ?
        'Password protection has been removed from this channel.' :
        `The password for this channel has been changed to ${password}.`;

    await broadcastAddMessage(conversation, {
        cat: 'info',
        body: text
    });
};

exports.getAllConversations = async function getAllConversations(user) {
    const windows = await Window.find({ userId: user.id });
    const conversations = [];

    for (const window of windows) {
        const conversation = await Conversation.fetch(window.get('conversationId'));
        conversations.push(conversation);
    }

    return conversations;
};

async function broadcastAddMessage(conversation, props, excludeSession) {
    await scanForEmailNotifications(conversation, props);

    props.conversationId = conversation.id;

    const message = await ConversationMessage.create(props);
    const ids = await ConversationMessage.findIds({ conversationId: conversation.id });

    while (ids.length - MSG_BUFFER_SIZE > 0) {
        const expiredMessage = await ConversationMessage.fetch(ids.shift());
        await expiredMessage.delete();
    }

    const ntf = message.convertToNtf();

    await broadcast(conversation, ntf, excludeSession);
    search.storeMessage(conversation.id, ntf);

    return ntf;
}

async function broadcast(conversation, msg, excludeSession) {
    const members = await ConversationMember.find({ conversationId: conversation.id });

    for (const member of members) {
        const userGId = UserGId.create(member.get('userGId'));

        if (!userGId.isMASUser) {
            continue;
        }

        const user = await User.fetch(userGId.id);
        const window = await windowsService.findOrCreate(user, conversation);

        msg.windowId = window.id;

        await notification.broadcast(user, msg, excludeSession);
    }
}

async function sendCompleteAddMembers(conversation, user) {
    if (!conversation) {
        log.warn('conversation missing.');
        return;
    }

    const window = await windowsService.findOrCreate(user, conversation);
    const members = await ConversationMember.find({ conversationId: conversation.id });

    const membersList = members.map(member => ({
        userId: member.get('userGId'),
        role: member.get('role')
    }));

    await notification.broadcast(user, {
        id: 'ADDMEMBERS',
        windowId: window.id,
        reset: true,
        members: membersList
    });
}

async function broadcastAddMembers(conversation, userGId, role) {
    await broadcast(conversation, {
        id: 'ADDMEMBERS',
        reset: false,
        members: [ {
            userId: userGId.toString(),
            role
        } ]
    });
}

async function remove(conversation) {
    const members = await ConversationMember.find({ conversationId: conversation.id });

    for (const member of members) {
        await member.delete();
    }

    const msgs = await ConversationMessage.find({ conversationId: conversation.id });

    for (const msg of msgs) {
        await msg.delete();
    }

    await conversation.delete();
}

async function removeConversationWindow(conversation, userGId) {
    if (userGId.type === 'mas') {
        const user = await User.fetch(userGId.id);
        const window = await Window.findFirst({ userId: user.id, conversationId: conversation.id });

        if (window) {
            log.info(user, `Removing window, id: ${window.id}`);

            await notification.broadcast(user, {
                id: 'CLOSE',
                windowId: window.id
            });

            await window.delete();
        }
    }
}

async function scanForEmailNotifications(conversation, message) {
    if (!message.userId || message.userId === 'i0') {
        return;
    }

    const users = [];

    if (conversation.get('type') === 'group') {
        const mentions = message.body.match(/(?:^| )@\S+(?=$| )/g);

        if (!mentions) {
            return;
        }

        for (const mention of mentions) {
            const user = await nicksService.getUserFromNick(
                mention.substring(1), conversation.get('network'));

            if (user) {
                users.push(user);
            }
        }

        if (users.length === 0) {
            return;
        }
    } else {
        const peerMember = await get1on1PeerMember(conversation, UserGId.create(message.userGId));
        const peerMemberGId = UserGId.create(peerMember.get('userGId'));

        if (peerMemberGId.isMASUser) {
            const user = await User.fetch(peerMemberGId.id);

            if (user) {
                users.push(user);
            }
        }
    }

    for (const user of users) {
        if (user.get('deleted')) {
            continue;
        }

        const online = await user.isOnline();

        if (online) {
            continue; // Mentioned user is online
        }

        const window = await Window.findFirst({
            userId: user.id,
            conversationId: conversation.id
        });

        if (!window) {
            continue; // Mentioned user is not on this group
        }

        if (window.get('emailAlert')) {
            const nickName = await nicksService.getCurrentNick(
                message.userId, conversation.get('network'));
            const name = user.get('name') || nickName;
            const notificationId = uuid(20);

            // TODO: Needs to be transaction, add lua script
            await redis.sadd('emailnotifications', user.gId);
            await redis.lpush(`emailnotificationslist:${user.gId}`, notificationId);

            await redis.hmset(`emailnotification:${notificationId}`, {
                type: conversation.get('type'),
                senderName: name,
                senderNick: nickName,
                groupName: conversation.get('name'),
                message: message.body
            });
        }
    }
}

async function get1on1PeerMember(conversation, userGId) {
    const members = await ConversationMember.find({ conversationId: conversation.id });

    return members.find(member => !member.gId.equals(userGId));
}

async function deleteConversationMember(conversation, member, options) {
    if (!member) {
        return; // TODO: When is this possible?
    }

    log.info(`User: ${member.get('userGId')} removed from conversation: ${conversation.id}`);

    if (!options.silent && conversation.get('type') === 'group') {
        await broadcastAddMessage(conversation, {
            userGId: member.get('userGId'),
            cat: options.wasKicked ? 'kick' : 'part',
            body: options.wasKicked && options.reason ? options.reason : ''
        });
    }

    await broadcast(conversation, {
        id: 'DELMEMBERS',
        members: [ {
            userId: member.get('userGId')
        } ]
    });

    // Never let window to exist alone without linked conversation
    await removeConversationWindow(conversation, UserGId.create(member.get('userGId')));

    await member.delete();

    // Delete conversation if no mas users are left
    const members = await ConversationMember.find({ conversationId: conversation.id });
    const masUserExists = members.some(remainingMember =>
        UserGId.create(remainingMember.get('userGId')).isMASUser);

    if (!masUserExists && !options.skipCleanUp) {
        log.info(`Last member parted, removing conversation, id: ${conversation.id}`);
        await remove(conversation);
    }
}
