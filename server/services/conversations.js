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
      User = require('../models/user'),
      Window = require('../models/window'),
      Conversation = require('../models/conversation'),
      ConversationMember = require('../models/conversationMember'),
      ConversationMessage = require('../models/conversationMessage'),
      UserGId = require('../models/userGId'),
      windowsService = require('../services/windows'),
      nicksService = require('../services/nicks');

let MSG_BUFFER_SIZE = 200; // TBD: This should come from session:max_backlog setting

exports.findOrCreate1on1 = async function(user, peerUserGId, network) {
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

    // TBD: Make sure peerUserId is either valid MAS user or that user doesn't have too many
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

exports.delete = async function(conversation) {
    return await remove(conversation);
};

exports.getPeerMember = async function(conversation, userGId) {
    return await getPeerMember(conversation, userGId);
}

exports.getMemberRole = async function(conversation, userGId) {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    const member = members.find(member => UserGId.create(member.get('userGId')).equals(userGId));

    return member ? member.get('role') : null;
};

exports.setMemberRole = async function(conversation, userGId, role) {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    const member = members.find(member => UserGId.create(member.get('userGId')).equals(userGId));

    if (member) {
        await member.set({ role });
        await broadcastAddMembers(conversation, userGId, role);
    }
};

exports.setGroupMembers = async function(conversation, newMembersHash) {
    let oldMembers = await ConversationMember.find({ conversationId: conversation.id });

    for (let oldMember of oldMembers) {
        if (!Object.keys(newMembersHash).some(newMember => newMember === oldMember.gIdString)) {
            await removeGroupMember(conversation, oldMember, true);
        }
    }

    for (let newMember of Object.keys(newMembersHash)) {
        if (!oldMembers.some(oldMembers => oldMembers.gIdString === newMember)) {
            await ConversationMember.create({
                conversationId: conversation.id,
                userGId: newMember,
                role: newMembersHash[newMember]
            });
        }
    }

    for (let newMember of Object.keys(newMembersHash)) {
        const newMemberGId = UserGId.create(newMember);

        if (newMemberGId.isMASUser) {
            const user = await User.fetch(newMemberGId.id);
            await sendFullAddMembers(conversation, user);
        }
    }
};

exports.addGroupMember = async function(conversation, userGId, role) {
    assert(role === 'u' || role === '+' || role === '@' || role === '*');

    const members = await ConversationMember.find({ conversationId: conversation.id });
    const member = members.find(member => member.get('userGId') === userGId.toString());

    if (!member) {
        await ConversationMember.create({
            conversationId: conversation.id,
            userGId: userGId.toString(),
            role: role
        });

        await broadcastAddMessage(conversation, {
            userGId: userGId.toString(),
            cat: 'join',
            body: ''
        });

        await broadcastAddMembers(conversation, userGId, role);
    } else {
        await member.set({ role: role });
    }
};

exports.removeGroupMember = async function(conversation, userGId, skipCleanUp, wasKicked, reason) {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    const member = members.find(member => member.get('userGId') === userGId.toString());

    if (!member) {
        return;
    }

    await removeGroupMember(conversation, member, skipCleanUp, wasKicked, reason);
};

exports.remove1on1Member = async function(conversation, userGId) {
    // Never let window to exist alone without linked conversation
    await removeConversationWindow(conversation, userGId);

    // No clean-up is currently needed. 1on1 discussions are never deleted. Group discussions
    // are deleted when the last member parts. This makes sense as groups are then totally reseted
    // when they become empty (TBD: except elasticsearch contains orphan logs). Never deleting
    // 1on1 conversations makes log searching from elasticsearch possible. TBD: On the other hand
    // dead 1on1s start to pile eventually on Redis.
};

exports.isMember = async function(conversation, user) {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    return members.some(member => member.get('userGId') === user.gId);
};

exports.addMessageUnlessDuplicate = async function(conversation, user, msg, excludeSession) {
    // A special filter for IRC backend.

    // To support Flowdock network where MAS user's message can come from the IRC server
    // (before all incoming messages from MAS users were ignored as delivery had happened
    // already locally) the overall logic is complicated. The code in the lua method now
    // works because IRC server doesn't echo messages back to their senders. If that wasn't
    // the case, lua reporter logic would fail. (If a reporter sees a new identical message
    // it's not considered as duplicate. Somebody is just repeating their line.)
    let duplicate = await redis.run('duplicateMsgFilter', user.gIdString, conversation.id,
        msg.userId, msg.body);

    if (!duplicate) {
        return await broadcastAddMessage(conversation, msg, excludeSession);
    }

    return {};
};

exports.addMessage = async function(conversation, msg, excludeSession) {
    return await broadcastAddMessage(conversation, msg, excludeSession);
};

exports.editMessage = async function(conversation, user, conversationMessageId, text) {
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

exports.sendFullAddMembers = async function(conversation, user) {
    return await sendFullAddMembers(conversation, user);
}

exports.setTopic = async function(conversation, topic, nickName) {
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

exports.setPassword = async function(conversation, password) {
    const changes = await conversation.set({ password });

    if (changes === 0) {
        return;
    }

    await broadcast(conversation, {
        id: 'UPDATE',
        password
    });

    let text = password === '' ?
        'Password protection has been removed from this channel.' :
        `The password for this channel has been changed to ${password}.`;

    await broadcastAddMessage(conversation, {
        cat: 'info',
        body: text
    });
};

exports.getAllConversations = async function(user) {
    const windows = await Window.find({ userId: user.id });
    let conversations = [];

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
    let ids = await ConversationMessage.findIds({ conversationId: conversation.id });

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
        let userGId = UserGId.create(member.get('userGId'));

        if (!userGId.isMASUser) {
            continue;
        }

        const user = await User.fetch(userGId.id);
        let window = await Window.findFirst({ userId: user.id, conversationId: conversation.id });

        if (!window && msg.id === 'MSG' && conversation.get('type') === '1on1') {
            // The case where one of the 1on1 members has closed his window
            window = await windowsService.create(user, conversation);
        } else if (!window) {
            log.warn(user,
                `User is a member of conversation ${conversation.id}, but the window is missing`);
            continue;
        }

        msg.windowId = window.id;

        await notification.broadcast(user, msg, excludeSession);
    }
}

async function sendFullAddMembers(conversation, user) {
    const window = await Window.findFirst({ userId: user.id, conversationId: conversation.id });
    const members = await ConversationMember.find({ conversationId: conversation.id });

    let membersList = members.map(member => ({
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
            role: role
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
    if (!message.userGId || message.userGId === 'i0') {
        return;
    }

    let users = [];

    if (conversation.get('type') === 'group') {
        let mentions = message.body.match(/(?:^| )@\S+(?=$| )/g);

        if (!mentions) {
            return;
        }

        for (let mention of mentions) {
            let user = await nicksService.getUserFromNick(
                mention.substring(1), conversation.get('network'));

            if (user) {
                users.push(user);
            }
        }

        if (users.length === 0) {
            return;
        }
    } else {
        const peerMember = await getPeerMember(conversation, UserGId.create(message.userGId))
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
            let nickName = await nicksService.getCurrentNick(message.userId, conversation.get('network'));
            let name = user.get('name') || nickName;
            let notificationId = uuid(20);

            // TBD: Needs to be transaction, add lua script
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

async function getPeerMember(conversation, userGId) {
    const members = await ConversationMember.find({ conversationId: conversation.id });

    return members.find(member => !member.gId.equals(userGId));
}

async function removeGroupMember(conversation, member, skipCleanUp, wasKicked, reason) {
    assert(conversation.get('type') === 'group');

    if (!member) {
        return; // TBD: When is this possible?
    }

    log.info(`User: ${member.get('userGId')} removed from conversation: ${conversation.id}`);

    await broadcastAddMessage(conversation, {
        userGId: member.get('userGId'),
        cat: wasKicked ? 'kick' : 'part',
        body: wasKicked && reason ? reason : ''
    });

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
    const masUserExists = members.some(member => UserGId.create(member.get('userGId')).isMASUser);

    if (!masUserExists && !skipCleanUp) {
        log.info(`Last member parted, removing conversation, id: ${conversation.id}`);
        await remove(conversation);
    }
}
