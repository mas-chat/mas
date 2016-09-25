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

const log = require('../lib/log');
const uid2 = require('uid2');
const redis = require('../lib/redis').createClient();
const init = require('../lib/init');
const notification = require('../lib/notification');
const search = require('../lib/search');
const conf = require('../lib/conf');
const courier = require('../lib/courier').create();
const mailer = require('../lib/mailer');
const conversationsService = require('../services/conversations');
const windowsService = require('../services/windows');
const friendsService = require('../services/friends');
const nicksService = require('../services/nicks');
const Conversation = require('../models/conversation');
const User = require('../models/user');
const Friend = require('../models/friend');
const Window = require('../models/window');
const Settings = require('../models/settings');
const IrcSubscription = require('../models/ircSubscription');
const UserGId = require('../models/userGId');
const ircUserHelper = require('../backends/irc/ircUserHelper');

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

init.on('beforeShutdown', async () => {
    await courier.quit();
});

exports.process = async function process(session, command) {
    const { windowId } = command;
    const network = (typeof command.network === 'string') ? command.network.toLowerCase() : null;
    const user = session.user;

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
        backend = conversation.get('network') === 'mas' ? 'loopbackparser' : 'ircparser';
    } else if (network) {
        backend = network === 'mas' ? 'loopbackparser' : 'ircparser';
    }

    const handler = handlers[command.id];

    if (handler) {
        return await handler({ user, session, window, conversation, backend, command, network });
    }

    log.warn(user, `Reveiced unknown request: ${command.id}`);
    return { status: 'ERROR', errorMsg: 'Unknown request' };
};

async function handleSend({ command, conversation, user, session, backend }) {
    const text = command.text;

    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Protocol error: Invalid windowId.' };
    } else if (typeof text !== 'string') {
        return { status: 'ERROR', errorMsg: 'Protocol error: text prop missing or not a string.' };
    } else if (text.length > 500) {
        return { status: 'ERROR', errorMsg: 'Message too long. Maximum length is 500 characters.' };
    }

    const msg = await conversationsService.addMessageUnlessDuplicate(conversation, user, {
        userGId: user.gIdString,
        cat: 'msg',
        body: text
    }, session.id);

    courier.callNoWait(backend, 'send', {
        userId: user.id,
        conversationId: conversation.id,
        text
    });

    return { status: 'OK', gid: msg.gid, ts: msg.ts };
}

async function handleEdit({ command, conversation, user }) {
    const { text, gid } = command;

    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Protocol error: Invalid windowId.' };
    } else if (!gid) {
        return { status: 'ERROR', errorMsg: 'Protocol error: Missing gid.' };
    }

    const success = await conversationsService.editMessage(conversation, user, gid, text);

    if (success) {
        search.updateMessage(gid, text);
        return { status: 'OK' };
    }

    return { status: 'ERROR', errorMsg: 'Editing failed.' };
}

async function handleCommand({ command, conversation, user, backend }) {
    const { command: name, params } = command;

    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    if (name === '1on1') {
        const targetUser = await nicksService.getUserFromNick(params.trim(), 'mas');

        if (!targetUser) {
            return { status: 'ERROR', errorMsg: 'Unknown MAS nick.' };
        }

        return await start1on1(user, targetUser.id, 'mas');
    } else if (name === 'ircquery') {
        if (backend === 'loopbackparser') {
            return { status: 'ERROR', errorMsg: 'You can only use /ircquery on IRC window' };
        }

        const targetUserGId = await ircUserHelper.getUserGId(params.trim(), params.network);

        // 1on1s between MAS users are forced through loopback backend as multiple 1on1s between
        // same people via different networks isn't useful feature, just confusing.
        const network = targetUserGId.isMASUser ? 'mas' : params.network;

        return await start1on1(user, targetUserGId, network);
    }

    return await courier.call(backend, 'textCommand', {
        userId: user.id,
        conversationId: conversation.id,
        command: name,
        commandParams: params
    });
}

async function handleCreate({ command, user }) {
    return await courier.call('loopbackparser', 'create', {
        userId: user.id,
        name: command.name,
        password: command.password
    });
}

async function handleJoin({ user, command, backend, network }) {
    if (!command.name || !command.network) {
        return { status: 'PARAMETER_MISSING', errorMsg: 'Name or network missing.' };
    }

    if (network !== 'mas' && !user.get('canUseIRC')) {
        return { status: 'NOT_ALLOWED', errorMsg: 'User does not have IRC rights.' };
    }

    const conversation = await Conversation.findFirst({
        type: 'group',
        name: command.name,
        network
    });

    if (conversation) {
        const isMember = await conversationsService.isMember(conversation, user);

        if (isMember) {
            return { status: 'ALREADY_JOINED', errorMsg: 'You have already joined the group.' };
        }
    }

    return await courier.call(backend, 'join', {
        userId: user.id,
        name: command.name,
        password: command.password || null, // Normalize, no password is null
        network
    });
}

async function handleClose({ user, conversation }) {
    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    await removeFromConversation(user, conversation);
    return { status: 'OK' };
}

async function handleUpdate({ user, command, window, session }) {
    const accepted = [ 'row', 'column', 'minimizedNamesList', 'desktop' ];
    const acceptedAlerts = [ 'email', 'notification', 'sound', 'title' ];

    if (!window) {
        log.warn(user, `Client tried to update non-existent window, command: ${command}`);
        return { status: 'ERROR' };
    }

    const newAlerts = {};
    let update = false;

    for (const prop of accepted) {
        const value = command[prop];

        if (typeof value !== 'undefined') {
            update = !!await window.set({ [prop]: value });
        }
    }

    if (command.alerts) {
        for (const alertsKey of acceptedAlerts) {
            const alertsValue = command.alerts[alertsKey];

            if (typeof alertsValue !== 'undefined') {
                update = true;
                newAlerts[alertsKey] = alertsValue;
                await window.set({ [`${alertsKey}Alert`]: alertsValue });
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
        }, session.id);
    }

    return { status: 'OK' };
}

async function handleUpdatePassword({ user, command, conversation, backend }) {
    const password = command.password;

    // TODO: loopback backend: Validate the new password. No spaces, limit length etc.

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
        password
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
    const properties = command.settings || {};
    const keys = Object.keys(properties);

    if (keys.length === 0) {
        return { status: 'OK' };
    }

    for (const prop of keys) {
        const value = properties[prop];

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
    const targetUserGId = UserGId.create(command.userId);
    const network = command.network;

    return await start1on1(user, targetUserGId, network);
}

async function start1on1(user, targetUserGId, network) {
    if (!targetUserGId || !targetUserGId.valid) {
        return { status: 'ERROR', errorMsg: 'Malformed request.' };
    } else if (targetUserGId.equals(user.gId)) {
        return { status: 'ERROR', errorMsg: 'You can\'t chat with yourself.' };
    } else if (targetUserGId.type === 'mas') {
        const targetUser = await User.fetch(targetUserGId.id);

        if (!userExists(targetUser)) {
            return { status: 'ERROR', errorMsg: 'Unknown MAS userId.' };
        }
    }

    const conversation = await conversationsService.findOrCreate1on1(user, targetUserGId, network);
    const existingWindow = await windowsService.findByConversation(user, conversation);

    if (existingWindow) {
        return {
            status: 'ERROR',
            errorMsg: '1on1 chat window with this person is already open.'
        };
    }

    await windowsService.create(user, conversation);

    return { status: 'OK' };
}

async function handleAckAlert({ user, command }) {
    const alertId = command.alertId;
    await redis.srem(`activealerts:${user.gId}`, alertId);

    return { status: 'OK' };
}

function handleLogout({ user, session }) {
    log.info(user, `User ended session. SessionId: ${session.id}`);

    session.state = 'terminating';

    return { status: 'OK' };
}

async function handleFetch({ command, conversation }) {
    if (!conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    } else if (!Number.isInteger(command.end)) {
        return { status: 'ERROR', errorMsg: 'Invalid end parameter.' };
    }

    const messages = await search.getMessageRange(
        conversation.id, command.start, command.end, command.limit, 50);

    return { status: 'OK', msgs: messages };
}

async function handleRequestFriend({ user, command }) {
    const friendCandidateUserGId = UserGId.create(command.userId);
    const friendUser = await User.fetch(friendCandidateUserGId.id);

    if (!friendUser) {
        return { status: 'ERROR', errorMsg: 'Unknown userId.' };
    } else if (user.id === friendUser.id) {
        return { status: 'ERROR', errorMsg: 'You can\'t add yourself as a friend, sorry.' };
    }

    const existingFriend = await Friend.findFirst({ srcUserId: user.id, dstUserId: friendUser.id });

    if (existingFriend) {
        return { status: 'ERROR', errorMsg: 'This person is already on your contacts list.' };
    }

    await friendsService.createPending(user, friendUser);
    await friendsService.sendFriendConfirm(user, friendUser);

    return { status: 'OK' };
}

async function handleFriendVerdict({ user, command }) {
    const requestorUserGId = UserGId.create(command.userId);
    const friendUser = await User.fetch(requestorUserGId.id);

    if (command.allow) {
        await friendsService.activateFriends(user, friendUser);
    }

    return { status: 'OK' };
}

async function handleRemoveFriend({ user, command }) {
    if (!command.userId) {
        return { status: 'ERROR', errorMsg: 'Invalid userId.' };
    }

    const friendUserGId = UserGId.create(command.userId);
    const friendUser = await User.fetch(friendUserGId.id);

    await friendsService.removeFriends(user, friendUser);
    await friendsService.sendFriends(user);

    return { status: 'OK' };
}

function handleGetProfile({ user }) {
    return { name: user.get('name'), email: user.get('email'), nick: user.get('nick') };
}

async function handleUpdateProfile({ user, command }) {
    const newName = command.name;
    const newEmail = command.email;

    if (newName) {
        await user.set('name', newName);
    }

    if (newEmail) {
        await user.set('email', newEmail);
    }

    // TODO: Check and report validation errors

    return { status: 'OK' };
}

async function handleDestroyAccount({ user }) {
    await user.delete();

    const conversations = await conversationsService.getAllConversations(user);

    for (const conversation of conversations) {
        await removeFromConversation(user, conversation);
    }

    const networks = Object.keys(conf.get('irc:networks'));

    for (const network of networks) {
        // Don't remove networkInfo entries as they are needed to
        // keep discussion logs parseable. Those logs contain userIds, not nicks.

        const subscriptions = await IrcSubscription.find({ userId: user.id, network });
        subscriptions.forEach(subscription => subscription.delete());
    }

    await friendsService.removeUser(user);

    return { status: 'OK' };
}

async function handleSendConfirmEmail({ user }) {
    await sendEmailConfirmationEmail(user);
    return { status: 'OK' };
}

async function sendEmailConfirmationEmail(user, email) {
    const emailConfirmationToken = uid2(25);

    await redis.setex(`emailconfirmationtoken:${emailConfirmationToken}`, 60 * 60 * 24, user.id);

    mailer.send('emails/build/confirmEmail.hbs', {
        name: user.get('name'),
        url: `${conf.getComputed('site_url')}/confirm-email/${emailConfirmationToken}`
    }, email || user.get('email'), 'Please confirm your email address');
}

function userExists(user) {
    return user && !user.get('deleted');
}

async function removeFromConversation(user, conversation) {
    // Backend specific cleanup
    courier.callNoWait(
        conversation.get('network') === 'mas' ? 'loopbackparser' : 'ircparser', 'close', {
            userId: user.id,
            network: conversation.get('network'),
            name: conversation.get('name'),
            conversationType: conversation.get('type')
        });

    if (conversation.get('type') === 'group') {
        await conversationsService.removeGroupMember(conversation, user.gId);
    } else {
        await conversationsService.remove1on1Member(conversation, user.gId);
    }
}
