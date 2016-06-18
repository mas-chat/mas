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
      Friend = require('../models/friend'),
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

    if (!userExists(user)) {
        // Account has been deleted very recently
        return {};
    }

    let conversation = null;
    let window = null;
    let backend = null;

    log.info(user, `Processing command: ${JSON.stringify(command)}`);

    if (Number.isInteger(windowId)) {
        window = await Window.fetch(windowId);

        if (window && window.get('userId') === user.id) {
            conversation = await Conversation.fetch(window.get('conversationId'));
        } else {
            window = null;
        }
    }

    if (conversation) {
        backend = conversation.get('network') === 'MAS' ? 'loopbackparser' : 'ircparser';
    } else if (network) {
        backend = network === 'MAS' ? 'loopbackparser' : 'ircparser';
    }

    const handler = handlers[command.id];

    if (handler) {
        return await handler({ user, sessionId, window, conversation, backend, command });
    } else {
        log.warn(user, `Reveiced unknown request: ${command.id}`);
        return { status: 'ERROR', errorMsg: 'Unknown request' };
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

    const msg = await conversationsService.addMessageUnlessDuplicate(conversation, user.gId, {
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

async function handleEdit({ command, conversation, user }) {
    const { text, gid } = params.command;

    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Protocol error: Invalid windowId.' };
    } else if (!gid) {
        return { status: 'ERROR', errorMsg: 'Protocol error: Missing gid.' };
    }

    let success = await conversation.editMessage(user, gid, text);

    if (success) {
        search.updateMessage(gid, text);
        return { status: 'OK' };
    } else {
        return { status: 'ERROR', errorMsg: 'Editing failed.' };
    }
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

    if (command.alerts) {
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
        let userExists = userExists(targetUserGId);

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
        let last = await redis.run('deleteSession', user.gId, sessionId);

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

async function handleRequestFriend({ user, command, sessionId }) {
    let friendCandidateUserGId = new UserGId(command.userId);
    let friendUser = await User.fetch(friendCandidateUserGId.id);

    if (!friendUser) {
        return { status: 'ERROR', errorMsg: 'Unknown userId.' };
    } else if (user.id === friendUser.id) {
        return { status: 'ERROR', errorMsg: 'You can\'t add yourself as a friend, sorry.' };
    }

    const existingFriend = await Friend.find({ srcUserId: user.id, dstUserId: friendUser.id });

    if (existingFriend) {
        return { status: 'ERROR', errorMsg: 'This person is already on your contacts list.' };
    }

    await friendsService.createPending(user, friendUser);
    await friendsService.sendFriendConfirm(friendUser, sessionId);

    return { status: 'OK' };
}

async function handleFriendVerdict({ user, command }) {
    let requestorUserGId = new UserGId(command.userId);
    let friendUser = await User.fetch(requestorUserGId.id);

    if (command.allow) {
        await friendsService.activateFriends(user, friendUser);
    }

    return { status: 'OK' };
}

async function handleRemoveFriend({ user, command }) {
    if (!command.userId) {
        return { status: 'ERROR', errorMsg: 'Invalid userId.' };
    }

    let friendUserGId = new UserGId(command.userId);
    let friendUser = await User.fetch(friendUserGId.id);

    await friendsService.removeFriends(user, friendUser);
    await friendsService.sendFriends(user.id);

    return { status: 'OK' };
}

async function handleGetProfile({ user }) {
    return { name: user.get('name'), email: user.get('email'), nick: user.get('nick') };
}

async function handleUpdateProfile({ user, command }) {
    let newName = command.name;
    let newEmail = command.email;

    if (newName) {
        await user.set('name', newName);
    }

    if (newEmail) {
        await user.set('email', newEmail);
    }

    // TBD: Check and report validation errors

    return { status: 'OK' };
}

async function handleDestroyAccount({ user }) {
    await user.set('deleted', true);

    let conversations = await conversationsService.getAllConversations(user);

    for (const conversation of conversations) {
        await removeFromConversation(user, conversation);
    }

    let networks = await redis.smembers('networklist');

    for (let network of networks) {
        // Don't remove 'networks::${userId}:${network}' entries as they are needed to
        // keep discussion logs parseable. Those logs contain userIds, not nicks.

        await redis.del(`ircchannelsubscriptions:${user.gId}:${network}`);
    }

    await friendsService.removeUser(user);

    return { status: 'OK' };
}

async function handleSendConfirmEmail({ user }) {
    await sendEmailConfirmationEmail(user);
    return { status: 'OK' };
}

async function sendEmailConfirmationEmail(user, email) {
    let emailConfirmationToken = uid2(25);

    await redis.setex(`emailconfirmationtoken:${emailConfirmationToken}`, 60 * 60 * 24, user.gId);

    mailer.send('emails/build/confirmEmail.hbs', {
        name: user.get('name'),
        url: conf.getComputed('site_url') + '/confirm-email/' + emailConfirmationToken
    }, email || user.get('email'), `Please confirm your email address`);
}

function userExists(user) {
    return user && !user.get('deleted');
}

async function removeFromConversation(user, conversation) {
    if (conversation.get('type') === 'group') {
        await conversationsService.removeGroupMember(user.gId);
    } else {
        await conversationsService.remove1on1Member(user.gId);
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
