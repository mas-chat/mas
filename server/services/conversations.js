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
      UserGId = require('../models/userGId'),
      windowService = require('../services/windows'),
      nicksService = require('../services/nicks');

let MSG_BUFFER_SIZE = 200; // TBD: This should come from session:max_backlog setting

exports.findOrCreate1on1 = async function(user, peerUserGId, network) {
    assert(user && peerUserGId && network);

    const name = [ user.gId, peerUserGId ].sort().join('-');

    let conversation = await Conversation.findFirst({
        type: '1on1',
        network: network,
        name: name
    });

    // TBD: Make sure peerUserId is either valid MAS user or that user doesn't have too many
    // 1on1 conversations.

    if (!conversation) {
        conversation = await Conversation.create({
            owner: user.gId,
            type: '1on1',
            name,
            network: network
        });

        await ConversationMember.create({
            conversationId: conversation.id,
            userId: user.gId,
            role: 'u'
        });

        await ConversationMember.create({
            conversationId: conversation.id,
            userId: user.gId,
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

exports.getMemberRole = async function(conversation, userGId) {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    const member = members.find(member => member.get('userGId') === userGId.toString());

    return member.get('role');
};

exports.setMemberRole = async function(conversation, userGId, role) {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    const member = members.find(member => member.get('userGId') === userGId.toString());

    await member.set({ role });

    await broadcastAddMembers(conversation, userGId, role);
};

exports.setGroupMembers = async function(conversation, members) {
    let oldMembers = await ConversationMember.find({ conversationId: conversation.id });

    for (let oldMember of oldMembers) {
        if (!members[oldMember.get('userGId')]) {
            await removeGroupMember(conversation, oldMember, true);
        }
    }

    for (let userGIdString of Object.keys(members)) {
        if (!oldMembers.find(member => member.get('userGId') === userGIdString)) {
            await ConversationMember.create({
                conversationId: conversation.id,
                userId: userGIdString,
                role: members[userGIdString]
            });
        }
    }

    for (let userGIdString of Object.keys(members)) {
        const userGId = UserGId.create(userGIdString);

        if (userGId.type === 'mas') {
            const user = await User.fetch(UserGId.id);
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
            userGId: userGId,
            role: role
        });

        await broadcastAddMessage(conversation, {
            userId: userGId.toString(),
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

    await member.remove();
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

exports.addMessageUnlessDuplicate = async function(conversation, userGId, msg, excludeSession) {
    // A special filter for IRC backend.

    // To support Flowdock network where MAS user's message can come from the IRC server
    // (before all incoming messages from MAS users were ignored as delivery had happened
    // already locally) the overall logic is complicated. The code in the lua method now
    // works because IRC server doesn't echo messages back to their senders. If that wasn't
    // the case, lua reporter logic would fail. (If a reporter sees a new identical message
    // it's not considered as duplicate. Somebody is just repeating their line.)
    let duplicate = await redis.run('duplicateMsgFilter', userGId, conversation.id,
        msg.userId, msg.body);

    if (!duplicate) {
        return await broadcastAddMessage(conversation, msg, excludeSession);
    }

    return {};
};

exports.addMessage = async function(conversation, msg, excludeSession) {
    return await broadcastAddMessage(conversation, msg, excludeSession);
};

exports.editMessage = async function(conversation, userGId, gid, text) {
    let ts = Math.round(Date.now() / 1000);

    let result = await redis.run('editMessage', conversation.id, gid, userGId, text, ts);

    if (!result) {
        return false;
    }

    let msg = JSON.parse(result);
    msg.id = 'MSG';

    await broadcast(conversation, msg);

    return true;
};

exports.sendFullAddMembers = async function(conversation, user) {
    return await sendFullAddMembers(conversation, user);
}

exports.sendUsers = async function(conversation, userGId) {
    const members = await ConversationMember.find({ conversationId: conversation.id });

    for (let member of members) {
        await redis.run('introduceNewUserIds', member.get('userGId'), null, null, true, userGId);
    }
};

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

async function broadcastAddMessage(conversation, msg, excludeSession) {
    msg.gid = await redis.incr('nextGlobalMsgId');
    msg.ts = Math.round(Date.now() / 1000);
    msg.id = 'MSG';

    await scanForEmailNotifications(conversation, msg);

    await redis.lpush(`conversationmsgs:${conversation.id}`, JSON.stringify(msg));
    await redis.ltrim(`conversationmsgs:${conversation.id}`, 0, MSG_BUFFER_SIZE - 1);

    await broadcast(conversation, msg, excludeSession);

    search.storeMessage(conversation.id, msg);

    return msg;
}

async function broadcast(conversation, msg, excludeSession) {
    const members = await ConversationMember.find({ conversationId: conversation.id });

    for (const member of members) {
        let window = await Window.findFirst({
           userId: member.get('userGId'),
           conversationId: conversation.id
        });

        if (!window && msg.id === 'MSG' && conversation.get('type') === '1on1') {
            // The case where one of the 1on1 members has closed his window
            window = await Window.create(member.get('userGId'), conversation.id);
        } else if (!window) {
            return;
        }

        msg.windowId = window.id;

        await notification.broadcast(member.get('userGId'), msg, excludeSession);
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
            userId: userGId,
            role: role
        } ]
    });
}

async function remove(conversation) {
    await conversation.delete();

    const members = await ConversationMember.find({ conversationId: conversation.id });

    for (const member of members) {
        await member.remove();
    }

    await redis.del(`conversationmsgs:${conversation.id}`);
}

async function removeConversationWindow(conversation, userGId) {
    if (userGId.type === 'mas') {
        await windowService.removeByConversationId(userGId, conversation);
    }
}

async function scanForEmailNotifications(conversation, message) {
    if (message.userId === 'iSERVER') {
        return;
    }

    let userGIds = [];

    if (conversation.get('type') === 'group') {
        let mentions = message.body.match(/(?:^| )@\S+(?=$| )/g);

        if (!mentions) {
            return;
        }

        for (let mention of mentions) {
            let userGIdString = await nicksService.getUserIdFromNick(
                mention.substring(1), conversation.get('network'));

            if (userGIdString) {
                userGIds.push(UserGId.create(userGIdString));
            }
        }

        if (userGIds.length === 0) {
            return;
        }
    } else {
        userGIds = [ await getPeerMember(conversation, UserGId.create(message.userId)) ];
    }

    for (const userGId of userGIds) {
        if (userGId.type !== 'mas') {
            continue;
        }

        const user = await User.fetch(userGId.id);

        if (!user || user.get('lastLogout') === 0) {
            continue; // Mentioned user is deleted or online
        }

        const window = await Window.findFirst({
            userId: userGId.id,
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

    return members.find(member => member.get('userGId') !== userGId.toString());
}

async function removeGroupMember(conversation, member, skipCleanUp, wasKicked, reason) {
    assert(conversation.get('type') === 'group');

    if (!member) {
        return; // TBD: When is this possible?
    }

    log.info(`User: ${member.get('userGId')} removed from conversation: ${conversation.id}`);

    await broadcastAddMessage(conversation, {
        userId: member.get('userGId'),
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

    const members = await ConversationMember.find({ conversationId: conversation.id });

    const masUserExists = members.some(member => {
        const userGId = UserGId.create(member.get('userGId'));
        return userGId.type === 'mas'
    });

    if (!masUserExists && !skipCleanUp) {
        log.info(`Last member parted, removing conversation, id: ${conversation.id}`);
        await remove(conversation);
    }
}
