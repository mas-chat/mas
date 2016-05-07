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
      init = require('../lib/init'),
      notification = require('../lib/notification'),
      search = require('../lib/search'),
      conf = require('../lib/conf'),
      courier = require('../lib/courier').create(),
      mailer = require('../lib/mailer'),
      conversationsService = require('../services/conversations'),
      windowsService = require('../services/windows'),
      friendsService = require('../services/friends'),
      nicksService = require('../services/nicks'),
      Conversation = require('../models/conversation'),
      User = require('../models/user'),
      Window = require('../models/window'),
      Settings = require('../models/settings'),
      UserGId = require('../models/userGId'),
      ircUser = require('../backends/irc/ircUser');

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
    let { windowId, network } = command;

    if (!userExistsCheck(user)) {
        // Account has been deleted very recently
        return {};
    }

    let conversation = null;
    let window = null;

    if (Number.isInteger(windowId)) {
        window = await Window.fetch(windowId);

        if (window && window.get('userId') === user.globalUserId) {
            conversation = await Conversation.fetch(window.get('conversationId'));
        } else {
            window = null;
        }
    }

    let backend = conversation.get('network') === 'MAS' ? 'loopbackparser' : 'ircparser';

    log.info(user, 'Processing command: ' + JSON.stringify(command));

    if (handlers[command.id]) {
        const id = command.id;
        return await handlers[id]({ user, sessionId, window, conversation, backend, command });
    } else {
        log.warn(user, `Reveiced unknown request: ${command.id}`);
        return {};
    }
};

async function handleSend({ command, conversation, user, sessionId, backend }) {
    let text = command.text;

    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Protocol error: Invalid windowId.' };
    } else if (typeof text !== 'string') {
        return { status: 'ERROR', errorMsg: 'Protocol error: text prop missing or not a string.' };
    } else if (text.length > 500) {
        return { status: 'ERROR', errorMsg: 'Message too long. Maximum length is 500 characters.' };
    }

    const msg = await conversationsService.addMessageUnlessDuplicate(user, {
        userId: user.gId,
        cat: 'msg',
        body: text
    }, sessionId);

    courier.callNoWait(backend, 'send', {
        userId: user.id,
        conversationId: conversation.id,
        text: text
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
            targetUserId = await nicksService.getUserIdFromNick(commandParams.trim(), 'MAS');

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

async function handleJoin({ user, command, backend }) {
    if (!command.name || !command.network) {
        return { status: 'PARAMETER_MISSING', errorMsg: 'Name or network missing.' };
    }

    let conversation = await Conversation.findFirst({
        type: 'group',
        network: command.network,
        name: command.name
    });

    if (conversation) {
        let isMember = await conversationsService.isMember(conversation, user);

        if (isMember) {
            return { status: 'ALREADY_JOINED', errorMsg: 'You have already joined the group.' };
        }
    }

    return await courier.call(backend, 'join', {
        userId: user.id,
        network: command.network,
        name: command.name,
        password: command.password || null // Normalize, no password is null
    });
}

async function handleClose({ user, conversation }) {
    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    await removeFromConversation(user, conversation);
    return { status: 'OK' };
}

async function handleUpdate({ user, command, window, sessionId }) {
    let accepted = [ 'row', 'column', 'minimizedNamesList', 'desktop' ];
    let acceptedAlerts = [ 'email', 'notification', 'sound', 'title' ];

    if (!window) {
        log.warn(user, `Client tried to update non-existent window, command: ${command}`);
        return { status: 'ERROR' };
    }

    let update = false;
    let newAlerts = {};

    for (let prop of accepted) {
        let value = command[prop];

        if (typeof(value) !== 'undefined') {
            update = !!await window.set({ [ prop ]: value });
        }
    }

    if (typeof(command.alerts) !== 'undefined') {
        for (let alertsKey of acceptedAlerts) {
            let alertsValue = command.alerts[alertsKey];

            if (typeof(alertsValue) !== 'undefined') {
                update = true;
                newAlerts[alertsKey] = alertsValue;
                await window.set({ [ `${alertsKey}Alert` ]: alertsValue });
            }
        }
    }

    if (update) {
        // Notify all sessions. Undefined body properties won't appear in the JSON message
        await notification.broadcast(user, {
            id: 'UPDATE',
            windowId: window.id,
            row: command.row,
            column: command.column,
            minimizedNamesList: command.minimizedNamesList,
            desktop: command.desktop,
            alerts: Object.keys(newAlerts) === 0 ? undefined : newAlerts
        }, sessionId);
    }

    return { status: 'OK' };
}

async function handleUpdatePassword({ user, command, conversation, backend }) {
    let password = command.password;

    // TBD: loopback backend: Validate the new password. No spaces, limit length etc.

    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    } else if (typeof password !== 'string') {
        return { status: 'ERROR', errorMsg: 'New password is invalid.' };
    } else if (conversation.get('type') === '1on1') {
        return { status: 'ERROR', errorMsg: 'Can\'t set password for 1on1.' };
    }

    return await courier.call(backend, 'updatePassword', {
        userId: user.id,
        conversationId: conversation.id,
        password: password
    });
}

async function handleUpdateTopic({ user, command, conversation, backend }) {
    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    return await courier.call(backend, 'updateTopic', {
        userId: user.id,
        conversationId: conversation.id,
        topic: command.topic
    });
}

async function handleSet({ user, command }) {
    let properties = command.settings || {};
    let keys = Object.keys(properties);

    if (keys.length === 0) {
        return { status: 'OK' };
    }

    for (let prop of keys) {
        let value = properties[prop];

        switch (prop) {
            case 'activeDesktop':
                if (!(await windowsService.isValidDesktop(user, value))) {
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

    const settings = await Settings.findFirst({ userId: user.id });
    await settings.set(properties);

    return { status: 'OK' };
}

async function handleChat({ user, command }) {
    let targetUserGId = new UserGId(command.userId);
    let network = 'MAS';

    if (targetUserGId.type === 'irc') {
        network = await redis.hget(`ircuser:${targetUserGId}`, 'network');
    }

    return await start1on1(user, targetUserGId, network);
}

async function start1on1(user, targetUserGId, network) {
    if (!targetUserGId || !targetUserGId.valid) {
        return { status: 'ERROR', errorMsg: 'Malformed request.' };
    }

    if (user.gId === targetUserGId) {
        return { status: 'ERROR', errorMsg: 'You can\'t chat with yourself.' };
    }

    if (targetUserGId.type === 'mas') {
        let userExists = userExistsCheck(targetUserGId);

        if (!userExists) {
            return { status: 'ERROR', errorMsg: 'Unknown MAS userId.' };
        }
    }

    let conversation = await conversationsService.findOrCreate1on1(user, targetUserGId, network);
    let existingWindow = await windowsService.findByConversation(user, conversation);

    if (existingWindow) {
        return {
            status: 'ERROR',
            errorMsg: '1on1 chat window with this person is already open.'
        };
    } else {
        await windowsService.create(user, conversation);
    }

    return { status: 'OK' };
}

async function handleAckAlert({ user, command }) {
    let alertId = command.alertId;
    await redis.srem(`activealerts:${user.gId}`, alertId);

    return { status: 'OK' };
}

async function handleLogout({ user, sessionId }) {
    log.info(user, 'User ended session. SessionId: ' + sessionId);

    setTimeout(async function() {
        // Give the system some time to deliver the acknowledgment before cleanup
        let last = await redis.run('deleteSession', userGId, sessionId);

        if (last) {
            await friendsService.informStateChange(user, 'logout');
        }
    }, 5000);

    return { status: 'OK' };
}

async function handleFetch({ command, conversation }) {
    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    } else if (!Number.isInteger(command.end)) {
        return { status: 'ERROR', errorMsg: 'Invalid end parameter.' };
    }

    let messages = await search.getMessageRange(
        conversation.id, command.start, command.end, command.limit, 50);

    return { status: 'OK', msgs: messages };
}

async function handleRequestFriend({ user, command }) {
    let friendCandidateUserGId = new UserGId(command.userId);
    let exists = !!await User.fetch(friendCandidateUserGId.id);

    if (!exists) {
        return { status: 'ERROR', errorMsg: 'Unknown userId.' };
    } else if (user.id === friendCandidateUserGId.id) {
        return { status: 'ERROR', errorMsg: 'You can\'t add yourself as a friend, sorry.' };
    }

    let existingFriend = await redis.sismember(`friends:${userId}`, friendCandidateUserId);

    if (existingFriend) {
        return { status: 'ERROR', errorMsg: 'This person is already on your contacts list.' };
    }

    await redis.sadd(`friendsrequests:${friendCandidateUserId}`, userId);
    await friendService.sendFriendConfirm(friendCandidateUserId, params.sessionId);

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
        await friendService.sendFriends(requestorUserId);
        await friendService.sendFriends(userId);
    }

    return { status: 'OK' };
}

async function handleRemoveFriend(params) {
    if (!params.command.userId) {
        return { status: 'ERROR', errorMsg: 'Invalid userId.' };
    }

    await redis.srem(`friends:${params.userId}`, params.command.userId);
    await friendService.sendFriends(params.userId);

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

    let conversationIds = await windowService.getAllConversationIds(userId);

    for (let conversationId of conversationIds) {
        let conversation = await conversationService.get(conversationId);
        await removeFromConversation(user, conversation);
    }

    let networks = await redis.smembers('networklist');

    for (let network of networks) {
        // Don't remove 'networks::${userId}:${network}' entries as they are needed to
        // keep discussion logs parseable. Those logs contain userIds, not nicks.

        await redis.del(`ircchannelsubscriptions:${userId}:${network}`);
    }

    await friendService.removeUser(userId);

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

function userExistsCheck(user) {
    return user && !user.get('deleted');
}

async function removeFromConversation(user, conversation) {
    if (conversation.get('type') === 'group') {
        await conversationService.removeGroupMember(user.gId);
    } else {
        await conversationService.remove1on1Member(user.gId);
    }

    // Backend specific cleanup
    courier.callNoWait(
        conversation.get('network') === 'MAS' ? 'loopbackparser' : 'ircparser', 'close', {
        userId: user.id,
        network: conversation.get('network'),
        name: conversation.get('name'),
        conversationType: conversation.get('type')
    });
}
