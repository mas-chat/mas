#!/usr/bin/env node
//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
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

const init = require('../../lib/init');

init.configureProcess('irc');

const assert = require('assert');
const conf = require('../../lib/conf');
const log = require('../../lib/log');
const redisModule = require('../../lib/redis');
const courier = require('../../lib/courier').createEndPoint('ircparser');
const User = require('../../models/user');
const IrcSubscription = require('../../models/ircSubscription');
const Conversation = require('../../models/conversation');
const ConversationMember = require('../../models/conversationMember');
const NetworkInfo = require('../../models/networkInfo');
const UserGId = require('../../models/userGId');
const conversationsService = require('../../services/conversations');
const windowsService = require('../../services/windows');
const nicksService = require('../../services/nicks');
const ircUserHelper = require('./ircUserHelper');
const ircScheduler = require('./scheduler');

const redis = redisModule.createClient();

const OPER = '@';
const VOICE = '+';
const USER = 'u';

const ircMessageBuffer = {};

// Process different IRC commands

const handlers = {
    '043': handle043,
    311: handle311,
    312: handle312,
    317: handle317,
    319: handle319,
    332: handle332,
    333: handleNoop, // RPL_TOPICWHOTIME: No good place to show
    353: handle353,
    366: handle366,
    376: handle376,
    401: handle401,
    433: handle433,
    482: handle482,

    474: handleJoinReject, // ERR_BANNEDFROMCHAN
    473: handleJoinReject, // ERR_INVITEONLYCHAN
    475: handleJoinReject, // ERR_BADCHANNELKEY
    471: handleJoinReject, // ERR_CHANNELISFULL
    403: handleJoinReject, // ERR_NOSUCHCHANNEL
    405: handleJoinReject, // ERR_TOOMANYCHANNELS
    407: handleJoinReject, // ERR_TOOMANYTARGETS
    437: handleJoinReject, // ERR_UNAVAILRESOURCE

    // All other numeric replies are processed by handleServerText()

    JOIN: handleJoin,
    PART: handlePart,
    QUIT: handleQuit,
    NICK: handleNick,
    MODE: handleMode,
    INVITE: handleInvite,
    KICK: handleKick,
    TOPIC: handleTopic,
    PRIVMSG: handlePrivmsg,
    NOTICE: handlePrivmsg,
    ERROR: handleError
};

init.on('beforeShutdown', async () => {
    await ircScheduler.quit();
    await courier.quit();
});

init.on('afterShutdown', () => {
    redisModule.shutdown();
    log.quit();
});

(async function main() {
    ircScheduler.init(disconnect);

    courier.on('send', processSend);
    courier.on('textCommand', processTextCommand);
    courier.on('join', processJoin);
    courier.on('close', processClose);
    courier.on('updatePassword', processUpdatePassword);
    courier.on('updateTopic', processUpdateTopic);
    courier.on('restarted', processRestarted);
    courier.on('data', processData);
    courier.on('noconnection', processNoConnection);
    courier.on('connected', processConnected);
    courier.on('disconnected', processDisconnected);
    courier.on('reconnectifinactive', processReconnectIfInactive);

    await courier.listen();
}());

// Upper layer messages

async function processSend({ conversationId, userId, text = '' }) {
    assert(conversationId);

    let target;
    const conversation = await Conversation.fetch(conversationId);
    const user = await User.fetch(userId);

    if (!conversation) {
        return;
    }

    if (conversation.get('type') === '1on1') {
        const peerMember = await conversationsService.getPeerMember(conversation, user.gId);
        const targetUserGId = UserGId.create(peerMember.get('userGId'));

        target = ircUserHelper.getIRCUserGIdNick(targetUserGId);
    } else {
        target = conversation.get('name');
    }

    // See addMessageUnlessDuplicate() for the rest of duplication detection logic
    const key = `ircduplicates:${conversation.id}:${msgFingerPrint(text)}:${user.gIdString}`;
    await redis.setex(key, 45, user.id);

    sendPrivmsg(user, conversation.get('network'), target, text.replace(/\n/g, ' '));
}

async function processTextCommand({ conversationId, userId, command, commandParams }) {
    const conversation = await Conversation.fetch(conversationId);
    let data = false;

    switch (command) {
        case 'part':
            return { status: 'ERROR', errorMsg: 'Use the window menu instead to leave.' };
        case 'msg':
            return { status: 'ERROR', errorMsg: 'Use /ircquery <nick> to start 1on1 via IRC' };
        case 'me':
            data = `PRIVMSG ${conversation.name} :\u0001ACTION ${commandParams}\u0001`;
            break;
        case 'topic':
            data = `TOPIC ${conversation.name} :${commandParams}`;
            break;
        default:
            break;
    }

    if (!data) {
        data = `${command} ${commandParams}`;
    }

    courier.callNoWait('connectionmanager', 'write', {
        userId,
        network: conversation.get('network'),
        line: data
    });

    return { status: 'OK' };
}

async function processJoin({ userId, network, name, password }) {
    const user = await User.fetch(userId);
    const networkInfo = await findOrCreateNetworkInfo(user, network);
    const hasChannelPrefixRegex = /^[&#!+]/;
    const illegalNameRegEx = /\s|\cG|,/; // See RFC2812, section 1.3
    let channelName = name;

    if (!channelName || channelName === '' || illegalNameRegEx.test(channelName)) {
        return { status: 'ERROR', errorMsg: 'Illegal or missing channel name.' };
    }

    if (!hasChannelPrefixRegex.test(channelName)) {
        channelName = `#${channelName}`;
    }

    await IrcSubscription.create({
        userId: user.id,
        network,
        channel: channelName,
        password
    });

    if (networkInfo.get('state') === 'connected') {
        sendJoin(user, network, channelName, password);
    } else if (networkInfo.get('state') !== 'connecting') {
        await connect(user, network);
    }

    return { status: 'OK' };
}

async function processClose({ userId, network, name, conversationType }) {
    const user = await User.fetch(userId);

    if (conversationType === 'group') {
        const subscription = await IrcSubscription.findFirst({
            userId: user.id,
            network,
            channel: name
        });

        subscription.delete();

        const networkInfo = await findOrCreateNetworkInfo(user, network);

        if (networkInfo.get('state') === 'connected') {
            sendIRCPart(user, network, name);
        }
    }

    await disconnectIfIdle(user, network);
}

async function processUpdatePassword({ userId, network, conversationId, password }) {
    const user = await User.fetch(userId);
    const conversation = await Conversation.fetch(conversationId);
    const networkInfo = await findOrCreateNetworkInfo(user, network);

    let modeline = `MODE ${conversation.name} `;

    if (password === '') {
        modeline += '-k foobar'; // IRC protocol is odd, -k requires dummy parameter
    } else {
        modeline += `+k ${password}`;
    }

    if (networkInfo.get('state') !== 'connected') {
        return {
            status: 'ERROR',
            errorMsg: 'Can\'t change the password. You are not connected to the IRC network'
        };
    }

    courier.callNoWait('connectionmanager', 'write', { userId: user.id, network, line: modeline });

    return { status: 'OK' };
}

async function processUpdateTopic({ userId, conversationId, network, topic }) {
    const user = await User.fetch(userId);
    const conversation = await Conversation.fetch(conversationId);
    const networkInfo = await findOrCreateNetworkInfo(user, network);

    if (networkInfo.get('state') !== 'connected') {
        return {
            status: 'ERROR',
            errorMsg: 'Can\'t change the topic. You are not connected to the IRC network'
        };
    }

    courier.callNoWait('connectionmanager', 'write', {
        userId,
        network: conversation.get('network'),
        line: `TOPIC ${conversation.get('name')} :${topic}`
    });

    return { status: 'OK' };
}

async function processReconnectIfInactive({ userId }) {
    const user = await User.fetch(userId);
    const networks = Object.keys(conf.get('irc:networks'));

    for (const network of networks) {
        const networkInfo = await findOrCreateNetworkInfo(user, network);

        if (networkInfo.get('state') === 'idledisconnected') {
            await addSystemMessage(user, network, 'info',
                'You were disconnected from IRC because you haven\'t used MAS for a long time. ' +
                'Welcome back! Reconnecting...');

            await connect(user, network);
        }
    }
}

// Connection manager messages

// Restarted
async function processRestarted() {
    await iterateUsersAndNetworks(async (user, network) => {
        // Try makes sure problems with one user don't affect others
        try {
            const subscriptions = await IrcSubscription.find({
                userId: user.id,
                network
            });

            const networkInfo = await findOrCreateNetworkInfo(user, network);

            if (subscriptions.length > 0 && networkInfo.get('state') !== 'idledisconnected') {
                log.info(user, `Scheduling connect() to IRC network: ${network}`);

                await addSystemMessage(user, network, 'info',
                    'MAS Server restarted. Global rate limiting to avoid flooding IRC ' +
                    ' server enabled. Next connect will be slow.');

                await connect(user, network);
            }
        } catch (e) {
            log.warn(user, `Exception: ${e}, stack: ${e.stack.replace(/\n/g, ',')}`);
        }
    });
}

async function iterateUsersAndNetworks(callback) {
    const networks = Object.keys(conf.get('irc:networks'));
    const allUsers = await User.fetchAll();

    if (networks.length === 0) {
        log.error('No IRC networks configured.');
    }

    for (const user of allUsers) {
        for (const network of networks) {
            await callback(user, network);
        }
    }
}

// Data
async function processData(params) {
    const key = params.userId + params.network;

    if (!ircMessageBuffer[key]) {
        ircMessageBuffer[key] = [];
    }

    ircMessageBuffer[key].push(params);

    // Don't process multiple protocol messages from single connection in parallel.
    // IRC messages must me processed in the same order they arrive. Especially
    // response 353 and 366 would race with bad results without this limit.

    if (ircMessageBuffer[key].length === 1) {
        // Works because this function is reentrant!
        while (ircMessageBuffer[key].length > 0) {
            await parseIrcMessage(ircMessageBuffer[key][0]);
            ircMessageBuffer[key].shift();
        }
    }
}

// No connection
async function processNoConnection({ userId, network }) {
    const user = await User.fetch(userId);

    log.warn(user, 'Disconnected user tried to send IRC command');

    await addSystemMessage(user, network, 'error', 'Can\'t send. Not connected to IRC currently.');
}

// Connected
async function processConnected({ userId, network }) {
    const user = await User.fetch(userId);

    log.info(user, 'Connected to IRC server');

    const commands = [
        `NICK ${user.get('nick')}`,
        `USER ${user.get('nick')} 8 * :${user.get('name')} (MAS v2.0)`
    ];

    courier.callNoWait('connectionmanager', 'write', { userId: user.id, network, line: commands });
}

// Disconnected
async function processDisconnected({ userId, network, reason }) {
    const user = await User.fetch(userId);
    const networkInfo = await findOrCreateNetworkInfo(user, network);
    const previousState = networkInfo.get('state');

    await networkInfo.set('state',
        previousState === 'idleclosing' ? 'idledisconnected' : 'disconnected');

    await nicksService.updateCurrentNick(user, network, null);

    if (previousState === 'closing' || previousState === 'idleclosing') {
        // We wanted to close the connection, don't reconnect
        return;
    }

    let delay = 30 * 1000; // 30s
    let msg = `Lost connection to IRC server (${reason}). Scheduling a reconnect attempt...`;

    const count = networkInfo.get('retryCount') + 1;

    await networkInfo.set('retryCount', count);

    // Set the backoff timer
    if (count > 3 && count < 8) {
        delay = 3 * 60 * 1000; // 3 mins
    } else if (count >= 8) {
        delay = 60 * 60 * 1000; // 1 hour
        msg = 'Error in connection to IRC server after multiple attempts. Waiting one hour ' +
            'before making another connection attempt. Close all windows related to this ' +
            'IRC network if you do not wish to retry.';
    }

    await addSystemMessage(user, network, 'error', msg);
    await connect(user, network, true, delay);
}

async function parseIrcMessage({ userId, line, network }) {
    const parts = line.trim().split(' ');
    const msg = {
        params: [],
        numericReply: false,
        network,
        serverName: null,
        nick: null,
        userNameAndHost: null
    };

    // See rfc2812

    if ((line.charAt(0) === ':')) {
        // Prefix exists
        const prefix = parts.shift();
        const nickEnds = prefix.indexOf('!');
        const identEnds = prefix.indexOf('@');

        if (nickEnds === -1 && identEnds === -1) {
            msg.serverName = prefix.substring(1);
        } else {
            msg.nick = prefix.substring(1, Math.min(nickEnds, identEnds));
            msg.userNameAndHost = prefix.substring(Math.min(nickEnds + 1, identEnds + 1));
        }
    }

    msg.command = parts.shift();

    if (msg.command.match(/^[0-9]+$/) !== null) {
        // Numeric reply
        msg.numericReply = true;
        msg.target = parts.shift();

        if (/^[&#!+]/.test(msg.target)) {
            // Channel names are case insensitive, always use lower case version
            msg.target = msg.target.toLowerCase();
        }
    }

    // Only the parameters are left now
    while (parts.length !== 0) {
        if (parts[0].charAt(0) === ':') {
            msg.params.push(parts.join(' ').substring(1));
            break;
        } else {
            msg.params.push(parts.shift());
        }
    }

    let handler = handlers[msg.command];

    if (!handler && msg.numericReply) {
        // Default handler for all numeric replies
        handler = handleServerText;
    }

    if (handler) {
        const user = await User.fetch(userId);
        await handler(user, msg, msg.command);
    }
}

async function addSystemMessage(user, network, cat, body) {
    const serverUserGId = UserGId.create({ type: 'irc', id: 0 });
    const conversation = await conversationsService.findOrCreate1on1(user, serverUserGId, network);

    await conversationsService.addMessage(conversation, { userGId: 'i0', cat, body });
}

async function connect(user, network, skipRetryCountReset, delay) {
    const networkInfo = await findOrCreateNetworkInfo(user, network);
    await nicksService.updateCurrentNick(user, network, user.get('nick'));

    await networkInfo.set('state', 'connecting');

    if (!skipRetryCountReset) {
        await networkInfo.set('retryCount', 0);
    }

    const delayText = delay ? ` in ${Math.round(delay / 1000 / 60)} minutes` : '';

    await addSystemMessage(user, network, 'info', `Connecting to IRC server${delayText}...`);

    ircMessageBuffer[user.id + network] = [];

    courier.callNoWait('connectionmanager', 'connect', {
        userId: user.id,
        nick: user.get('nick'),
        network,
        delay: delay || 0
    });
}

async function disconnect(user, network, nextState) {
    const networkInfo = await findOrCreateNetworkInfo(user, network);
    await networkInfo.set('state', nextState || 'closing');

    courier.callNoWait('connectionmanager', 'disconnect', {
        userId: user.id,
        network,
        reason: 'No open discussions left.'
    });
}

async function handleNoop() { // eslint-disable-line no-empty-function
}

async function handleServerText(user, msg, code) {
    // :mas.example.org 001 toyni :Welcome to the MAS IRC toyni
    const text = msg.params.join(' ');
    // 371, 372 and 375 = MOTD and INFO lines
    const cat = code === '372' || code === '375' || code === '371' ? 'banner' : 'server';

    if (text) {
        await addSystemMessage(user, msg.network, cat, text);
    }
}

async function handle401(user, msg) {
    // :irc.localhost 401 ilkka dadaa :No such nick/channel
    const targetUserGId = await ircUserHelper.getUserGId(msg.params[0], msg.network);
    const conversation = await conversationsService.findOrCreate1on1(
        user, targetUserGId, msg.network);

    await conversationsService.addMessage(conversation, {
        userGId: 'i0',
        cat: 'error',
        body: `${msg.params[0]} is not in IRC.`
    });
}

async function handle043(user, msg) {
    // :*.pl 043 AnDy 0PNEAKPLG :nickname collision, forcing nick change to your unique ID.
    const newNick = msg.params[0];
    const oldNick = msg.target;

    await updateNick(user, msg.network, oldNick, newNick);
    await tryDifferentNick(user, msg.network);
}

async function handle311(user, msg) {
    // :irc.localhost 311 ilkka_ Mika7 ~Mika7 127.0.0.1 * :Real Name (Ralph v1.0)
    const nick = msg.params[0];
    const username = msg.params[1];
    const host = msg.params[2];
    const realName = msg.params[4];

    await addSystemMessage(user, msg.network, 'server',
        `--- ${nick} is [${username}@${host}] (${realName})`);
}

async function handle312(user, msg) {
    // :irc.localhost 312 ilkka_ Mika7 irc.localhost :Darwin ircd default configuration
    const server = msg.params[1];
    const serverInfo = msg.params[2];

    await addSystemMessage(user, msg.network, 'server',
        `--- using server ${server} [${serverInfo}]`);
}

async function handle317(user, msg) {
    // irc.localhost 317 ilkka_ Mika7 44082 1428703143 :seconds idle, signon time
    const idleTime = msg.params[1];
    const signonTime = new Date(parseInt(msg.params[2]) * 1000).toUTCString();

    await addSystemMessage(user, msg.network, 'server',
        `--- has been idle ${idleTime} seconds. Signed on ${signonTime}`);
}

async function handle319(user, msg) {
    // :irc.localhost 319 ilkka_ Mika7 :#portaali @#hemmot @#ilves #ceeassa
    const channels = msg.params[1];

    await addSystemMessage(user, msg.network, 'server', `--- on channels ${channels}`);
}

async function handle332(user, msg) {
    // :portaali.org 332 ilkka #portaali :Cool topic
    const channel = msg.params[0];
    const topic = msg.params[1];
    const conversation = await Conversation.findFirst({
        type: 'group',
        name: channel,
        network: msg.network
    });

    if (conversation) {
        await conversationsService.setTopic(conversation, topic, msg.target);
    }
}

async function handle353(user, msg) {
    // :own.freenode.net 353 drwillie @ #evergreenproject :drwillie ilkkaoks
    const channel = msg.params[1];
    const namesPart = msg.params[2];

    if (namesPart === '') {
        // Some servers send empty 353 RPL_NAMREPLY
        return;
    }

    const conversation = await Conversation.findFirst({
        type: 'group',
        name: channel,
        network: msg.network
    });

    if (conversation) {
        await bufferNames(namesPart.split(' '), user, msg.network, conversation);
    }
}

async function handle366(user, msg) {
    // :pratchett.freenode.net 366 il3kkaoksWEB #testi1 :End of /NAMES list.
    const channel = msg.params[0];
    const conversation = await Conversation.findFirst({
        type: 'group',
        name: channel,
        network: msg.network
    });

    if (!conversation) {
        return;
    }

    const key = `namesbuffer:${user.id}:${conversation.id}`;
    const namesHash = await redis.hgetall(key);

    await redis.del(key);

    if (namesHash && Object.keys(namesHash).length > 0) {
        // During the server boot-up or reconnect after a network outage it's very possible that
        // 366 replies get reordered if more than one mas user joins a same channel. Then an
        // older 366 reply (with fewer names on the list) is used to the reset the group members
        // data structure, which leads to incorrect bookkeeping. Ircnamesreporter check makes sure
        // only one 266 reply is parsed from a burst. For rest of the changes we rely on getting
        // incremental JOINS messages (preferably from the original reporter.) This leaves some
        // theoretical error edge cases (left as homework) that maybe are worth fixing.
        const noActiveReporter = await redis.setnx(
            `ircnamesreporter:${conversation.id}`, user.id);

        if (noActiveReporter) {
            await redis.expire(`ircnamesreporter:${conversation.id}`, 15); // 15s
            await conversationsService.setGroupMembers(conversation, namesHash);
        }
    }
}

async function handle376(user, msg) {
    const networkInfo = await findOrCreateNetworkInfo(user, msg.network);

    await addSystemMessage(user, msg.network, 'server', msg.params.join(' '));

    if (networkInfo.get('state') !== 'connected') {
        await networkInfo.set({
            state: 'connected',
            retryCount: 0
        });

        await addSystemMessage(user, msg.network, 'info', 'Connected to IRC server.');
        await addSystemMessage(user, msg.network, 'info',
            'You can close this window at any time. It\'ll reappear when needed.');

        // Tell the client nick we got
        // TODO: replace: await redis.run('introduceNewUserIds', userId, null, null, true, userId);

        const subscriptions = await IrcSubscription.find({
            userId: user.id,
            network: msg.network
        });

        if (!subscriptions) {
            log.info(user, 'Connected, but no channels/1on1s to join. Disconnecting');
            await disconnect(user, msg.network);
            return;
        }

        subscriptions.forEach(subscription => {
            sendJoin(user, msg.network, subscription.get('channel'), subscription.get('password'));
        });
    }
}

async function handle433(user, msg) {
    // :mas.example.org 433 * ilkka :Nickname is already in use.
    await tryDifferentNick(user, msg.network);
}

async function handle482(user, msg) {
    // irc.localhost 482 ilkka #test2 :You're not channel operator
    const channel = msg.params[0];

    await addSystemMessage(
        user, msg.network, 'error', `You're not channel operator on ${channel}`);
}

async function handleJoin(user, msg) {
    // :neo!i=ilkkao@iao.iki.fi JOIN :#testi4
    const channel = msg.params[0];
    const network = msg.network;
    const targetUser = await nicksService.getUserFromNick(msg.nick, network);
    let conversation = await Conversation.findFirst({
        type: 'group',
        name: channel,
        network
    });

    if (targetUser) {
        // MAS user joined channel
        let subscription = await IrcSubscription.findFirst({
            userId: targetUser.id,
            network,
            channel
        });

        if (!subscription) {
            // IrcSubscription entry is missing. This means IRC server has added the user
            // to a channel without any action from the user. ircchannelsubscriptions must be
            // updated as it's used to rejoin channels after a server restart.
            subscription = await IrcSubscription.create({
                userId: targetUser.id,
                network,
                channel,
                password: null
            });
        }

        const password = subscription.get('password');

        if (!conversation) {
            conversation = await Conversation.create({
                owner: targetUser.id,
                type: 'group',
                name: channel,
                password,
                network
            });

            log.info(targetUser, `First mas user joined channel: ${network}:${channel}`);
        }

        const window = await windowsService.findByConversation(targetUser, conversation);

        if (!window) {
            await windowsService.create(targetUser, conversation);
            await conversationsService.sendFullAddMembers(conversation, targetUser);
        }

        if (password) {
            // Conversation exists and this user used non empty password successfully to join
            // the channel. Update conversation password as it's possible that all other
            // mas users were locked out during a server downtime and conversation.password is
            // out of date.
            await conversation.set('password', password);
        }
    }

    const userGId = await ircUserHelper.getUserGId(msg.nick, msg.network);
    await conversationsService.addGroupMember(conversation, userGId, 'u');
}

async function handleJoinReject(user, msg) {
    const channel = msg.params[0];
    const reason = msg.params[1];

    if (isChannel(channel)) {
        const conversation = await Conversation.findFirst({
            type: 'group',
            name: channel,
            network: msg.network
        });

        await addSystemMessage(user, msg.network,
            'error', `Failed to join ${channel}. Reason: ${reason}`);

        const subscription = await IrcSubscription.findFirst({
            userId: user.id,
            network: msg.network,
            channel
        });

        await subscription.delete();

        if (conversation) {
            await conversationsService.removeGroupMember(conversation, user.gId);
        }

        await disconnectIfIdle(user, msg.network);
    } else {
        // Nick is unavailable
        await tryDifferentNick(user, msg.network);
    }
}

async function handleQuit(user, msg) {
    // :ilkka!ilkkao@localhost.myrootshell.com QUIT :"leaving"
    // let reason = msg.params[0];
    const conversations = await conversationsService.getAll(user);

    for (const conversation of conversations) {
        // TODO: Send a real quit message instead of part
        if (conversation.get('network') === msg.network && conversation.get('type') === 'group') {
            // No need to check if the targetUser is on this channel,
            // removeGroupMember() is clever enough
            const userGId = await ircUserHelper.getUserGId(msg.nick, msg.network);
            await conversationsService.removeGroupMember(conversation, userGId);
        }
    }
}

async function handleNick(user, msg) {
    // :ilkkao!~ilkkao@localhost NICK :foobar
    const newNick = msg.params[0];
    const oldNick = msg.nick;

    await updateNick(user, msg.network, oldNick, newNick);
}

async function handleError(user, msg) {
    const reason = msg.params[0];

    await addSystemMessage(
        user, msg.network, 'error', `Connection lost. Server reason: ${reason}`);

    if (reason.includes('Too many host connections')) {
        log.warn(user, `Too many connections to: ${msg.network}`);

        await addSystemMessage(user, msg.network, 'error',
            `${msg.network} IRC network doesn\'t allow more connections. Close all windows related to this IRC network and rejoin another day to try again.`); // eslint-disable-line max-len
    }
}

async function handleInvite(user, msg) {
    // :ilkkao!~ilkkao@127.0.0.1 INVITE buppe :#test2
    const channel = msg.params[1];

    await addSystemMessage(
        user, msg.network, 'info', `${msg.nick} has invited you to channel ${channel}`);
}

async function handleKick(user, msg) {
    // :ilkkao!~ilkkao@127.0.0.1 KICK #portaali AnDy :no reason
    const channel = msg.params[0];
    const targetNick = msg.params[1];
    const reason = msg.params[2];

    const conversation = await Conversation.findFirst({
        type: 'group',
        name: channel,
        network: msg.network
    });

    const targetUserGId = await ircUserHelper.getUserGId(targetNick, msg.network);

    if (conversation) {
        await conversationsService.removeGroupMember(
            conversation, targetUserGId, { wasKicked: true, reason });
    }

    if (targetUserGId.equals(user.gId)) {
        // I was kicked
        await addSystemMessage(user, msg.network,
            'error', `You have been kicked from ${channel}, Reason: ${reason}`);

        await disconnectIfIdle(user, msg.network);
    }
}

async function handlePart(user, msg) {
    // :ilkka!ilkkao@localhost.myrootshell.com PART #portaali :
    const channel = msg.params[0];
    const reason = msg.params[1];

    const conversation = await Conversation.findFirst({
        type: 'group',
        name: channel,
        network: msg.network
    });

    const targetUserGId = await ircUserHelper.getUserGId(msg.nick, msg.network);

    if (conversation) {
        await conversationsService.removeGroupMember(conversation, targetUserGId, { reason });
    }
}

async function handleMode(user, msg) {
    // :ilkka9!~ilkka9@localhost.myrootshell.com MODE #sunnuntai +k foobar3
    const target = msg.params[0];

    if (!isChannel(target)) {
        // TDB: Handle user's mode change
        return;
    }

    const conversation = await Conversation.findFirst({
        type: 'group',
        name: target,
        network: msg.network
    });

    if (!conversation) {
        return;
    }

    await addMessageUnlessDuplicate(conversation, user, {
        cat: 'info',
        body: `Mode change: ${msg.params.join(' ')} by ${msg.nick ? msg.nick : msg.serverName}`
    });

    const modeParams = msg.params.slice(1);

    while (modeParams.length !== 0) {
        const command = modeParams.shift();
        const oper = command.charAt(0);
        const modes = command.substring(1).split('');

        if (!(oper === '+' || oper === '-')) {
            log.warn(user, `Received broken MODE command: ${command}`);
            continue;
        }

        for (const mode of modes) {
            let param;
            let newClass = null;
            let targetUserGId = null;

            if (mode.match(/[klbeIOovq]/)) {
                param = modeParams.shift();

                if (!param) {
                    log.warn(user, `Received broken MODE command, parameter for ${mode} missing`);
                    continue;
                } else if (mode.match(/[ov]/)) {
                    targetUserGId = await ircUserHelper.getUserGId(param, msg.network);
                }
            }

            if (mode === 'o' && oper === '+') {
                // Got oper status
                newClass = OPER;
            } else if (mode === 'o' && oper === '-') {
                // Lost oper status
                newClass = USER;
            } else if (mode === 'v') {
                const oldClass =
                    await conversationsService.getMemberRole(conversation, targetUserGId);

                if (oldClass !== OPER) {
                    if (oper === '+') {
                        // Non-oper got voice
                        newClass = VOICE;
                    } else {
                        // Non-oper lost voice
                        newClass = USER;
                    }
                }
            } else if (mode === 'k') {
                const newPassword = oper === '+' ? param : null;

                await conversation.set('password', newPassword);

                const subscription = await IrcSubscription.findFirst({
                    userId: user.id,
                    network: msg.network,
                    channel: target
                });

                await subscription.set('password', newPassword);
            }

            if (newClass) {
                await conversationsService.updateMemberRole(conversation, targetUserGId, newClass);
            }
        }
    }
}

async function handleTopic(user, msg) {
    // :ilkka!ilkkao@localhost.myrootshell.com TOPIC #portaali :My new topic
    const channel = msg.params[0];
    const topic = msg.params[1];
    const conversation = await Conversation.findFirst({
        type: 'group',
        name: channel,
        network: msg.network
    });

    if (conversation) {
        await conversationsService.setTopic(conversation, topic, msg.nick);
    }
}

async function handlePrivmsg(user, msg, command) {
    // :ilkkao!~ilkkao@127.0.0.1 NOTICE buppe :foo
    const target = msg.params[0];
    const currentNick = await nicksService.getCurrentNick(user, msg.network);
    let conversation;
    let sourceUserGId;
    let text = msg.params[1];
    let cat = 'msg';

    if (msg.nick) {
        sourceUserGId = await ircUserHelper.getUserGId(msg.nick, msg.network);
    } else {
        // Message is from the server if the nick is missing
        sourceUserGId = UserGId.create({ type: 'irc', id: 0 });
    }

    if (text.includes('\u0001') && command === 'PRIVMSG') {
        const ret = parseCTCPMessage(text);
        let reply = false;

        if (ret.type === 'ACTION') {
            cat = 'action';
            text = ret.data;
        } else if (ret.type === 'VERSION') {
            reply = '\u0001VERSION masclient:0.8.0:Linux\u0001';
        } else if (ret.type === 'PING') {
            reply = text;
        }

        if (reply) {
            courier.callNoWait('connectionmanager', 'write', {
                userId: user.id,
                network: msg.network,
                line: `NOTICE ${msg.nick} :${reply}`
            });
            return;
        }
    }

    if (target.toLowerCase() === currentNick.toLowerCase()) {
        // Message is for the user only
        conversation = await conversationsService.findOrCreate1on1(
            user, sourceUserGId, msg.network);
    } else {
        conversation = await Conversation.findFirst({
            type: 'group',
            name: target,
            network: msg.network
        });

        if (conversation === null) {
            // :verne.freenode.net NOTICE * :*** Got Ident response
            await addSystemMessage(user, msg.network, 'info', text);
            return;
        }
    }

    await addMessageUnlessDuplicate(conversation, user, {
        userGId: sourceUserGId.toString(),
        cat,
        body: text
    });
}

async function updateNick(user, network, oldNick, newNick) {
    let changed = false;
    let targetUserGId = null;
    const nickUser = await nicksService.getUserFromNick(oldNick, network);

    if (nickUser) {
        const networkInfo = await findOrCreateNetworkInfo(nickUser, network);
        const updatedProps = await networkInfo.set('nick', newNick);

        if (updatedProps === 1) {
            changed = true;
            targetUserGId = user.gId;
        }
    } else {
        changed = await redis.set(
            `nickchangemutex:${network}:${oldNick}:${newNick}`, 1, 'ex', 20, 'nx');
        targetUserGId = await ircUserHelper.getUserGId(oldNick, network);
    }

    if (!changed) {
        return;
    }

    // We haven't heard about this change before
    log.info(user, `I\'m first and announcing ${oldNick} -> ${newNick} nick change.`);

    const conversationMembers = await ConversationMember.find(
        { userGId: targetUserGId.toString() });

    // Iterate through the conversations that the nick changer is part of
    for (const conversationMember of conversationMembers) {
        const conversation = await Conversation.fetch(conversationMember.get('conversationId'));

        if (conversation.get('network') !== network) {
            continue;
        }

        // Some 1on1 are closed (no window), don't activate them
        if (conversation.get('type') !== '1on1') {
            await addMessageUnlessDuplicate(conversation, user, {
                cat: 'info',
                body: `${oldNick} is now known as ${newNick}`
            });
        }

        await conversationsService.removeGroupMember(
            conversation, conversationMember.gId, { silent: true });

        await conversationsService.addGroupMember(
            conversation,
            (await ircUserHelper.getUserGId(newNick, network)),
            conversationMember.get('role'), { silent: true });
    }
}

async function tryDifferentNick(user, network) {
    const nick = user.get('nick');
    let currentNick = await nicksService.getCurrentNick(user, network);

    if (nick !== currentNick.substring(0, nick.length)) {
        // Current nick is unique ID, let's try to change it to something unique immediately
        currentNick = nick + (100 + Math.floor(Math.random() * 900));
    } else if (currentNick === nick) {
        // Second best choice
        currentNick = `${nick}_`;
    } else if (currentNick === `${nick}_`) {
        // Third best choice
        currentNick = nick + Math.floor(Math.random() * 10);
    } else {
        // If all else fails, keep adding random numbers
        currentNick += Math.floor(Math.random() * 10);
    }

    await nicksService.updateCurrentNick(user, network, currentNick);

    courier.callNoWait('connectionmanager', 'write', {
        userId: user.id,
        network,
        line: `NICK ${currentNick}`
    });
}

async function addMessageUnlessDuplicate(conversation, user, { userGId = null, cat, body = '' }) {
    // The code below works because IRC server doesn't echo messages back to their senders.
    // If that wasn't the case, the logic would fail. (If a reporter sees a new identical message
    // it's not considered as duplicate. Somebody is just repeating their line.)
    const key = `ircduplicates:${conversation.id}:${msgFingerPrint(body)}:${userGId}`;
    const reporter = user.id;

    const [ setexResult, getResult ] = await redis.multi().setnx(key, reporter).get(key).exec();

    if (setexResult[1] === 1) { // the key was set
        await redis.expire(key, 45);
    } else if (parseInt(getResult[1]) !== user.id) {
        return; // duplicate;
    }

    await conversationsService.addMessage(conversation, { userGId, cat, body });
}

// TODO: Add a timer (every 15min?) to send one NAMES to every irc channel to make sure memberslist
// is in sync?

async function disconnectIfIdle(user, network) {
    const windows = await windowsService.getWindowsForNetwork(user, network);
    let onlyServer1on1Left = false;

    if (windows.length === 1) {
        // There's only one window left, is it IRC server 1on1?
        // If yes, we can disconnect from the server
        const lastConversation = await Conversation.fetch(windows[0].get('conversationId'));

        if (lastConversation.get('type') === '1on1') {
            const peerMember = await conversationsService.getPeerMember(lastConversation, user.gId);

            if (peerMember.gIdString === 'i0') {
                onlyServer1on1Left = true;
            }
        }
    }

    if (windows.length === 0 || onlyServer1on1Left) {
        await disconnect(user, network);
    }

    if (onlyServer1on1Left) {
        await addSystemMessage(user, network,
           'info', 'No open windows left for this network. Disconnected.');
    }
}

async function bufferNames(names, user, network, conversation) {
    const namesHash = {};

    for (let nick of names) {
        let userClass;

        switch (nick.charAt(0)) {
            case '@':
                userClass = OPER;
                break;
            case '+':
                userClass = VOICE;
                break;
            default:
                userClass = USER;
                break;
        }

        if (userClass === OPER || userClass === VOICE) {
            nick = nick.substring(1);
        }

        const memberUserGId = await ircUserHelper.getUserGId(nick, network);
        namesHash[memberUserGId.toString()] = userClass;
    }

    const key = `namesbuffer:${user.id}:${conversation.id}`;

    await redis.hmset(key, namesHash);
    await redis.expire(key, 60); // 1 minute. Does cleanup if we never get End of NAMES list reply.
}

function parseCTCPMessage(text) {
    // Follow http://www.irchelp.org/irchelp/rfc/ctcpspec.html
    const regex = /\u0001(.*?)\u0001/g;
    let matches;

    while ((matches = regex.exec(text)) !== null) { // eslint-disable-line no-cond-assign
        const msg = matches[1];
        let dataType;
        let payload = '';

        if (msg.includes(' ')) {
            dataType = msg.substr(0, msg.indexOf(' '));
            payload = msg.substr(msg.indexOf(' ') + 1);
        } else {
            dataType = msg;
        }

        // Only one CTCP extended message per PRIVMSG is supported for now
        return { type: dataType || 'UNKNOWN', data: payload };
    }

    return { type: 'UNKNOWN' };
}

function isChannel(text) {
    return [ '&', '#', '+', '!' ].some(element => element === text.charAt(0));
}

function sendPrivmsg(user, network, target, text) {
    courier.callNoWait('connectionmanager', 'write', {
        userId: user.id,
        network,
        line: `PRIVMSG ${target} :${text}`
    });
}

function sendJoin(user, network, channel, password) {
    courier.callNoWait('connectionmanager', 'write', {
        userId: user.id,
        network,
        line: `JOIN ${channel} ${password}`
    });
}

function sendIRCPart(user, network, channel) {
    courier.callNoWait('connectionmanager', 'write', {
        userId: user.id,
        network,
        line: `PART ${channel}`
    });
}

async function findOrCreateNetworkInfo(user, network) {
    let networkInfo = await NetworkInfo.findFirst({
        userId: user.id,
        network
    });

    if (!networkInfo) {
        networkInfo = await NetworkInfo.create({
            userId: user.id,
            network,
            nick: user.get('nick'),
            state: 'disconnected',
            retryCount: 0
        });

        assert(networkInfo.valid);
    }

    return networkInfo;
}

function msgFingerPrint(body) {
    return body.trim().substring(0, 100).replace(/[\n\r]/g, ' ');
}
