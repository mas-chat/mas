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

const log = require('../lib/log'),
      uid2 = require('uid2'),
      redis = require('../lib/redis').createClient(),
      notification = require('../lib/notification'),
      search = require('../lib/search'),
      conf = require('../lib/conf'),
      courier = require('../lib/courier').create(),
      mailer = require('../lib/mailer'),
      conversationFactory = require('../models/conversation'),
      window = require('../models/window'),
      user = require('../models/user'),
      nick = require('../models/nick'),
      friends = require('../services/friends'),
      ircUser = require('../backends/irc/ircUser'),
      init = require('../lib/init');

const handlers = {
    SEND: handleSend,
    EDIT: handleEdit,
    COMMAND: handleCommand,
    CREATE: handleCreate,
    JOIN: handleJoin,
    CLOSE: handleClose,
    UPDATE: handleUpdate,
    UPDATE_PASSWORD: handleUpdatePassword,
    UPDATE_TOPIC: handleUpdateTopic,
    SET: handleSet,
    CHAT: handleChat,
    ACKALERT: handleAckAlert,
    LOGOUT: handleLogout,
    GET_PROFILE: handleGetProfile,
    UPDATE_PROFILE: handleUpdateProfile,
    REQUEST_FRIEND: handleRequestFriend,
    FRIEND_VERDICT: handleFriendVerdict,
    REMOVE_FRIEND: handleRemoveFriend,
    DESTROY_ACCOUNT: handleDestroyAccount,
    SEND_CONFIRM_EMAIL: handleSendConfirmEmail,
    FETCH: handleFetch
};

init.on('beforeShutdown', async function() {
    await courier.quit();
});

exports.process = async function(user, sessionId, command) {
    let windowId = command.windowId;
    let network = command.network;
    let userId = user.id;

    let userExists = await userExistsCheck(userId);

    if (!userExists) {
        // Account has been deleted very recently
        return {};
    }

    let conversation = null;

    if (Number.isInteger(windowId)) {
        let conversationId = await window.getConversationId(userId, windowId);
        conversation = await conversationFactory.get(conversationId);
        network = conversation ? conversation.network : null;
    }

    let backend = network === 'MAS' ? 'loopbackparser' : 'ircparser';

    log.info(userId, 'Processing command: ' + JSON.stringify(command));

    // TBD: Check that windowId, network, and name are valid

    if (handlers[command.id]) {
        return await handlers[command.id]({
            userId: userId,
            sessionId: sessionId,
            windowId: windowId,
            conversation: conversation,
            backend: backend,
            network: network,
            command: command
        });
    }

    log.warn(userId, `Reveiced unknown request: ${command.id}`);
    return {};
};

async function handleSend(params) {
    let text = params.command.text;

    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Protocol error: Invalid windowId.' };
    } else if (typeof text !== 'string') {
        return { status: 'ERROR', errorMsg: 'Protocol error: text prop missing or not a string.' };
    } else if (text.length > 500) {
        return { status: 'ERROR', errorMsg: 'Message too long. Maximum length is 500 characters.' };
    }

    if (params.conversation.type === '1on1' && params.conversation.network === 'MAS') {
        let targetUserId = await params.conversation.getPeerUserId(params.userId);
        let userExists = await userExistsCheck(targetUserId);

        if (!userExists) {
            return { status: 'ERROR',
                errorMsg: 'This MAS user\'s account is deleted. Please close this conversation.' };
        }
    }

    let msg = await params.conversation.addMessageUnlessDuplicate(params.userId, {
        userId: params.userId,
        cat: 'msg',
        body: params.command.text
    }, params.sessionId);

    courier.callNoWait(params.backend, 'send', {
        userId: params.userId,
        conversationId: params.conversation.conversationId,
        text: params.command.text
    });

    return { status: 'OK', gid: msg.gid, ts: msg.ts };
}

async function handleEdit(params) {
    let text = params.command.text;
    let gid = params.command.gid;

    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Protocol error: Invalid windowId.' };
    } else if (!gid) {
        return { status: 'ERROR', errorMsg: 'Protocol error: Missing gid.' };
    }

    let success = await params.conversation.editMessage(params.userId, gid, text);

    if (success) {
        search.updateMessage(gid, text);
    }

    return success ? { status: 'OK' } : { status: 'ERROR', errorMsg: 'Editing failed.' };
}

async function handleCommand(params) {
    let userId = params.userId;
    let command = params.command.command;
    let commandParams = params.command.params;
    let targetUserId;

    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    switch (command) {
        case '1on1':
            targetUserId = await nick.getUserIdFromNick(commandParams.trim(), 'MAS');

            if (!targetUserId) {
                return { status: 'ERROR', errorMsg: 'Unknown MAS nick.' };
            }

            return await start1on1(userId, targetUserId, 'MAS');
        case 'ircquery':
            if (params.network === 'MAS') {
                return { status: 'ERROR', errorMsg: 'You can only use /ircquery on IRC window' };
            }

            targetUserId = await ircUser.getUserId(commandParams.trim(), params.network);

            // 1on1s between MAS users are forced through loopback backend as multiple 1on1s between
            // same people via different networks isn't useful feature, just confusing.
            return await start1on1(
                userId, targetUserId, targetUserId.charAt(0) === 'm' ? 'MAS' : params.network);
    }

    return await courier.call(params.backend, 'textCommand', {
        userId: userId,
        conversationId: params.conversation.conversationId,
        command: command,
        commandParams: commandParams
    });
}

async function handleCreate(params) {
    return await courier.call('loopbackparser', 'create', {
        userId: params.userId,
        name: params.command.name,
        password: params.command.password
    });
}

async function handleJoin(params) {
    if (!params.command.name || !params.command.network) {
        return { status: 'PARAMETER_MISSING', errorMsg: 'Name or network missing.' };
    }

    let conversation = await conversationFactory.findGroup(
        params.command.name, params.command.network);

    if (conversation) {
        let isMember = await conversation.isMember(params.userId);

        if (isMember) {
            return { status: 'ALREADY_JOINED', errorMsg: 'You have already joined the group.' };
        }
    }

    return await courier.call(params.backend, 'join', {
        userId: params.userId,
        network: params.command.network,
        name: params.command.name,
        password: params.command.password || '' // Normalize, no password is '', not null or false
    });
}

async function handleClose(params) {
    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    await removeFromConversation(params.userId, params.conversation);
    return { status: 'OK' };
}

async function handleUpdate(params) {
    let userId = params.userId;
    let windowId = params.windowId;

    let accepted = [ 'row', 'column', 'minimizedNamesList', 'desktop' ];
    let acceptedAlerts = [ 'email', 'notification', 'sound', 'title' ];

    let oldValues = await redis.hgetall(`window:${userId}:${windowId}`);

    if (!oldValues) {
        log.warn(userId, `Client tried to update non-existent window, command: ${params.command}`);
        return { status: 'ERROR' };
    }

    let update = false;
    let newAlerts = {};

    for (let prop of accepted) {
        let value = params.command[prop];

        if (typeof(value) !== 'undefined' && value !== oldValues[prop]) {
            update = true;
            await redis.hset(`window:${userId}:${windowId}`, prop, value);
        }
    }

    if (typeof(params.command.alerts) !== 'undefined') {
        for (let alertsKey of acceptedAlerts) {
            let alertsValue = params.command.alerts[alertsKey];

            if (typeof(alertsValue) !== 'undefined') {
                update = true;
                newAlerts[alertsKey] = alertsValue;
                await redis.hset(`window:${userId}:${windowId}`, `${alertsKey}Alert`, alertsValue);
            }
        }
    }

    if (update) {
        // Notify all sessions. Undefined body properties won't appear in the JSON message
        await notification.broadcast(userId, {
            id: 'UPDATE',
            windowId: windowId,
            row: params.command.row,
            column: params.command.column,
            minimizedNamesList: params.command.minimizedNamesList,
            desktop: params.command.desktop,
            alerts: Object.keys(newAlerts) === 0 ? undefined : newAlerts
        }, params.sessionId);
    }

    return { status: 'OK' };
}

async function handleUpdatePassword(params) {
    let password = params.command.password;

    // TBD: loopback backend: Validate the new password. No spaces, limit length etc.

    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    } else if (typeof password !== 'string') {
        return { status: 'ERROR', errorMsg: 'New password is invalid.' };
    } else if (params.conversation.type === '1on1') {
        return { status: 'ERROR', errorMsg: 'Can\'t set password for 1on1.' };
    }

    return await courier.call(params.backend, 'updatePassword', {
        userId: params.userId,
        conversationId: params.conversation.conversationId,
        password: password
    });
}

async function handleUpdateTopic(params) {
    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    return await courier.call(params.backend, 'updateTopic', {
        userId: params.userId,
        conversationId: params.conversation.conversationId,
        topic: params.command.topic
    });
}

async function handleSet(params) {
    let properties = params.command.settings || {};
    let keys = Object.keys(properties);

    if (keys.length === 0) {
        return;
    }

    for (let prop of keys) {
        let value = properties[prop];

        switch (prop) {
            case 'activeDesktop':
                if (!(await window.isValidDesktop(params.userId, value))) {
                    return { status: 'ERROR', errorMsg: `Desktop '${value}' doesn't exist` };
                }
                break;
            case 'theme':
                if (!(value === 'default' || value === 'dark')) {
                    return { status: 'ERROR', errorMsg: 'Unknown theme' };
                }
                break;
            default:
                return { status: 'ERROR', errorMsg: `'${prop}' is not a valid settings property` };
        }
    }

    await redis.hmset(`settings:${params.userId}`, properties);

    return { status: 'OK' };
}

async function handleChat(params) {
    let userId = params.userId;
    let targetUserId = params.command.userId;
    let network = 'MAS';

    if (targetUserId.charAt(0) !== 'm') {
        network = await redis.hget(`ircuser:${targetUserId}`, 'network');
    }

    return await start1on1(userId, targetUserId, network);
}

async function start1on1(userId, targetUserId, network) {
    if (!targetUserId || typeof targetUserId !== 'string') {
        return { status: 'ERROR', errorMsg: 'Malformed request.' };
    }

    if (userId === targetUserId) {
        return { status: 'ERROR', errorMsg: 'You can\'t chat with yourself.' };
    }

    if (targetUserId.charAt(0) === 'm') {
        let userExists = await userExistsCheck(targetUserId);

        if (!userExists) {
            return { status: 'ERROR', errorMsg: 'Unknown MAS userId.' };
        }
    }

    let conversation = await conversationFactory.findOrCreate1on1(userId, targetUserId, network);
    let existingWindow = await window.findByConversationId(userId, conversation.conversationId);

    if (existingWindow) {
        return {
            status: 'ERROR',
            errorMsg: '1on1 chat window with this person is already open.'
        };
    } else {
        await window.create(userId, conversation.conversationId);
    }

    return { status: 'OK' };
}

async function handleAckAlert(params) {
    let alertId = params.command.alertId;
    await redis.srem(`activealerts:${params.userId}`, alertId);

    return { status: 'OK' };
}

async function handleLogout(params) {
    log.info(params.userId, 'User ended session. SessionId: ' + params.sessionId);

    setTimeout(async function() {
        // Give the system some time to deliver the acknowledgment before cleanup
        let last = await redis.run('deleteSession', params.userId, params.sessionId);

        if (last) {
            await friends.informStateChange(params.userId, 'logout');
        }
    }, 5000);

    return { status: 'OK' };
}

async function handleFetch(params) {
    let command = params.command;

    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    } else if (!Number.isInteger(command.end)) {
        return { status: 'ERROR', errorMsg: 'Invalid end parameter.' };
    }

    let conversationId = params.conversation.conversationId;
    let messages = await search.getMessageRange(
        conversationId, command.start, command.end, command.limit, 50);

    return { status: 'OK', msgs: messages };
}

async function handleRequestFriend(params) {
    let userId = params.userId;
    let friendCandidateUserId = params.command.userId;
    let exists = await redis.exists(`user:${friendCandidateUserId}`);

    if (!exists) {
        return { status: 'ERROR', errorMsg: 'Unknown userId.' };
    } else if (userId === friendCandidateUserId) {
        return { status: 'ERROR', errorMsg: 'You can\'t add yourself as a friend, sorry.' };
    }

    let existingFriend = await redis.sismember(`friends:${userId}`, friendCandidateUserId);

    if (existingFriend) {
        return { status: 'ERROR', errorMsg: 'This person is already on your contacts list.' };
    }

    await redis.sadd(`friendsrequests:${friendCandidateUserId}`, userId);
    await friends.sendFriendConfirm(friendCandidateUserId, params.sessionId);

    return { status: 'OK' };
}

async function handleFriendVerdict(params) {
    let userId = params.userId;
    let requestorUserId = params.command.userId;

    let removed = await redis.srem(`friendsrequests:${userId}`, requestorUserId);

    if (removed === 0) {
        return { status: 'ERROR', errorMsg: 'Invalid userId.' };
    }

    if (params.command.allow) {
        await redis.sadd(`friends:${userId}`, requestorUserId);
        await redis.sadd(`friends:${requestorUserId}`, userId);

        // Inform both parties
        await friends.sendFriends(requestorUserId);
        await friends.sendFriends(userId);
    }

    return { status: 'OK' };
}

async function handleRemoveFriend(params) {
    if (!params.command.userId) {
        return { status: 'ERROR', errorMsg: 'Invalid userId.' };
    }

    await redis.srem(`friends:${params.userId}`, params.command.userId);
    await friends.sendFriends(params.userId);

    return { status: 'OK' };
}

async function handleGetProfile(params) {
    let userRecord = await redis.hgetall(`user:${params.userId}`);
    return { name: userRecord.name, email: userRecord.email, nick: userRecord.nick };
}

async function handleUpdateProfile(params) {
    let userId = params.userId;
    let newName = params.command.name;
    let newEmail = params.command.email;

    // Keep in sync with register controller.
    if (newName.length < 6) {
        return { status: 'ERROR', errorMsg: 'Name is too short.' };
    } else if (!(/\S+@\S+\.\S+/.test(newEmail))) {
        return { status: 'ERROR', errorMsg: 'Invalid email address' };
    }

    user.update(userId, {
        email: params.command.email,
        name: params.comman.name
    });

    return { status: 'OK' };
}

async function handleDestroyAccount(params) {
    let userId = params.userId;

    user.delete(userId);

    let conversationIds = await window.getAllConversationIds(userId);

    for (let conversationId of conversationIds) {
        let conversation = await conversationFactory.get(conversationId);
        await removeFromConversation(userId, conversation);
    }

    let networks = await redis.smembers('networklist');

    for (let network of networks) {
        // Don't remove 'networks::${userId}:${network}' entries as they are needed to
        // keep discussion logs parseable. Those logs contain userIds, not nicks.

        await redis.del(`ircchannelsubscriptions:${userId}:${network}`);
    }

    await friends.removeUser(userId);

    return { status: 'OK' };
}

async function handleSendConfirmEmail(params) {
    let userId = params.userId;

    // TBD: This has moved
    await sendEmailConfirmationEmail(userId);
    return { status: 'OK' };
}

async function sendEmailConfirmationEmail(userId, email) {
    let userRecord = await redis.hgetall(`user:${userId}`);
    let emailConfirmationToken = uid2(25);

    await redis.setex(`emailconfirmationtoken:${emailConfirmationToken}`, 60 * 60 * 24, userId);

    mailer.send('emails/build/confirmEmail.hbs', {
        name: userRecord.name,
        url: conf.getComputed('site_url') + '/confirm-email/' + emailConfirmationToken
    }, email || userRecord.email, `Please confirm your email address`);
}

async function userExistsCheck(userId) {
    let userRecord = await redis.hgetall(`user:${userId}`);

    return userRecord && userRecord.deleted !== 'true';
}

async function removeFromConversation(userId, conversation) {
    if (conversation.type === 'group') {
        await conversation.removeGroupMember(userId);
    } else {
        await conversation.remove1on1Member(userId);
    }

    // Backend specific cleanup
    courier.callNoWait(conversation.network === 'MAS' ? 'loopbackparser' : 'ircparser', 'close', {
        userId: userId,
        network: conversation.network,
        name: conversation.name,
        conversationType: conversation.type
    });
}
