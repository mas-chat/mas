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

const assert = require('assert'),
      log = require('../../lib/log'),
      redisModule = require('../../lib/redis'),
      redis = redisModule.createClient(),
      courier = require('../../lib/courier').createEndPoint('ircparser'),
      conversationFactory = require('../../models/conversation'),
      window = require('../../services/windows'),
      nicks = require('../../models/nick'),
      ircUser = require('./ircUser'),
      ircScheduler = require('./scheduler');

const OPER = '@';
const VOICE = '+';
const USER = 'u';

let ircMessageBuffer = {};

// Process different IRC commands

let handlers = {
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

init.on('beforeShutdown', async function() {
    await ircScheduler.quit();
    await courier.quit();
});

init.on('afterShutdown', async function() {
    redisModule.shutdown();
    log.quit();
});

(async function() {
    await redisModule.loadScripts();
    await redisModule.initDB();
    ircScheduler.init();

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
})();

// Upper layer messages

async function processSend(params) {
    assert(params.conversationId);

    let conversation = await conversationFactory.get(params.conversationId);

    if (!conversation) {
        return;
    }

    let target = conversation.name;

    if (conversation.type === '1on1') {
        let targetUserId = await conversation.getPeerUserId(params.userId);
        target = await redis.hget(`ircuser:${targetUserId}`, 'nick');
    }

    let text = params.text || '';
    text = text.replace(/\n/g, ' ');

    if (target) {
        sendPrivmsg(params.userId, conversation.network, target, text);
    }
}

async function processTextCommand(params) {
    let conversation = await conversationFactory.get(params.conversationId);
    let command = params.command;
    let commandParams = params.commandParams;
    let network = conversation.network;
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
    }

    if (!data) {
        data = `${command} ${commandParams}`;
    }

    courier.callNoWait(
        'connectionmanager', 'write', { userId: params.userId, network: network, line: data });

    return { status: 'OK' };
}

async function processJoin(params) {
    let state = await redis.hget(`networks:${params.userId}:${params.network}`, 'state');
    let channelName = params.name;
    let hasChannelPrefixRegex = /^[&#!+]/;
    let illegalNameRegEx = /\s|\cG|,/; // See RFC2812, section 1.3

    if (!channelName || channelName === '' || illegalNameRegEx.test(channelName)) {
        return { status: 'ERROR', errorMsg: 'Illegal or missing channel name.' };
    }

    if (!hasChannelPrefixRegex.test(channelName)) {
        channelName = '#' + channelName;
    }

    await redis.hset(`ircchannelsubscriptions:${params.userId}:${params.network}`,
        channelName.toLowerCase(), params.password);

    if (state === 'connected') {
        sendJoin(params.userId, params.network, channelName, params.password);
    } else if (state !== 'connecting') {
        await connect(params.userId, params.network);
    }

    return { status: 'OK' };
}

async function processClose(params) {
    let state = await redis.hget(`networks:${params.userId}:${params.network}`, 'state');

    await redis.hdel(`ircchannelsubscriptions:${params.userId}:${params.network}`,
       params.name.toLowerCase());

    if (state === 'connected' && params.conversationType === 'group') {
        sendIRCPart(params.userId, params.network, params.name);
    }

    await disconnectIfIdle(params.userId, params.network);
}

async function processUpdatePassword(params) {
    let conversation = await conversationFactory.get(params.conversationId);
    let network = conversation.network;
    let state = await redis.hget(`networks:${params.userId}:${network}`, 'state');
    let modeline = 'MODE ' + conversation.name + ' ';

    if (params.password === '') {
        modeline += '-k foobar'; // IRC protocol is odd, -k requires dummy parameter
    } else {
        modeline += '+k ' + params.password;
    }

    if (state !== 'connected') {
        return {
            status: 'ERROR',
            errorMsg: 'Can\'t change the password. You are not connected to the IRC network'
        };
    }

    courier.callNoWait(
        'connectionmanager', 'write', { userId: params.userId, network: network, line: modeline });

    return { status: 'OK' };
}

async function processUpdateTopic(params) {
    let conversation = await conversationFactory.get(params.conversationId);
    let state = await redis.hget(`networks:${params.userId}:${conversation.network}`, 'state');

    if (state !== 'connected') {
        return {
            status: 'ERROR',
            errorMsg: 'Can\'t change the topic. You are not connected to the IRC network'
        };
    } else {
        courier.callNoWait('connectionmanager', 'write', {
            userId: params.userId,
            network: conversation.network,
            line: 'TOPIC ' + conversation.name + ' :' + params.topic
        });

        return { status: 'OK' };
    }
}

async function processReconnectIfInactive(params) {
    let userId = params.userId;
    let networks = await redis.smembers('networklist');

    for (let network of networks) {
        let state = await redis.hget(`networks:${userId}:${network}`, 'state');

        if (state === 'idledisconnected') {
            await addSystemMessage(userId, network, 'info',
                'You were disconnected from IRC because you haven\'t used MAS for a long time. ' +
                'Welcome back! Reconnecting...');

            await connect(userId, network);
        }
    }
}

// Connection manager messages

// Restarted
async function processRestarted() {
    await iterateUsersAndNetworks(async function(userId, network) {
        let channels = await redis.hgetall(`ircchannelsubscriptions:${userId}:${network}`);
        let state = await redis.hget(`networks:${userId}:${network}`, 'state');

        if (channels && state !== 'idledisconnected') {
            log.info(userId, 'Scheduling connect() to IRC network: ' + network);

            await addSystemMessage(userId, network, 'info',
                'MAS Server restarted. Global rate limiting to avoid flooding IRC ' +
                ' server enabled. Next connect will be slow.');

            await connect(userId, network);
        }
    });
}

async function iterateUsersAndNetworks(callback) {
    let allUsers = await redis.smembers('userlist');
    let networks = await redis.smembers('networklist');

    if (networks.length === 0) {
        log.error('No networks.');
    }

    for (let userId of allUsers) {
        for (let network of networks) {
            if (network !== 'MAS') {
                await callback(userId, network);
            }
        }
    }
}

// Data
async function processData(params) {
    let key = params.userId + params.network;

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
async function processNoConnection(params) {
    await addSystemMessage(params.userId, params.network, 'error',
        'Can\'t send. Not connected to IRC currently.');
}

// Connected
async function processConnected(params) {
    let user = await redis.hgetall(`user:${params.userId}`);
    let network = params.network;

    log.info(params.userId, 'Connected to IRC server');

    let commands = [
        'NICK ' + user.nick,
        'USER ' + user.nick + ' 8 * :Real Name (Ralph v1.0)'
    ];

    courier.callNoWait(
        'connectionmanager', 'write', { userId: params.userId, network: network, line: commands });
}

// Disconnected
async function processDisconnected(params) {
    let userId = params.userId;
    let network = params.network;
    let previousState = await redis.hget(`networks:${userId}:${network}`, 'state');

    await redis.hset(`networks:${userId}:${network}`, 'state',
        previousState === 'idleclosing' ? 'idledisconnected' : 'disconnected');

    await nicks.removeCurrentNick(userId, network);

    if (previousState === 'closing' || previousState === 'idleclosing') {
        // We wanted to close the connection, don't reconnect
        return;
    }

    let delay = 30 * 1000; // 30s
    let msg = `Lost connection to IRC server (${params.reason}). Scheduling a reconnect attempt...`;
    let count = await redis.hincrby(`networks:${userId}:${network}`, 'retryCount', 1);

    // Set the backoff timer
    if (count > 3 && count < 8) {
        delay = 3 * 60 * 1000; // 3 mins
    } else if (count >= 8) {
        delay = 60 * 60 * 1000; // 1 hour
        msg = 'Error in connection to IRC server after multiple attempts. Waiting one hour ' +
            'before making another connection attempt. Close all windows related to this ' +
            'IRC network if you do not wish to retry.';
    }

    await addSystemMessage(userId, network, 'error', msg);
    await connect(params.userId, params.network, true, delay);
}

async function parseIrcMessage(params) {
    let line = params.line.trim(),
        parts = line.split(' '),
        msg = {
            params: [],
            numericReply: false,
            network: params.network,
            serverName: null,
            nick: null,
            userNameAndHost: null
        };

    // See rfc2812

    if ((line.charAt(0) === ':')) {
        // Prefix exists
        let prefix = parts.shift();

        let nickEnds = prefix.indexOf('!');
        let identEnds = prefix.indexOf('@');

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
        await handler(params.userId, msg, msg.command);
    }
}

async function addSystemMessage(userId, network, cat, body) {
    let conversation = await conversationFactory.findOrCreate1on1(userId, 'iSERVER', network);

    await conversation.addMessage({
        userId: 'iSERVER',
        cat: cat,
        body: body
    });
}

async function connect(userId, network, skipRetryCountReset, delay) {
    let nick = await redis.hget(`user:${userId}`, 'nick');
    await nicks.updateCurrentNick(userId, network, nick);

    await redis.hset(`networks:${userId}:${network}`, 'state', 'connecting');

    if (!skipRetryCountReset) {
        await resetRetryCount(userId, network);
    }

    let delayText = delay ? ` in ${Math.round(delay / 1000 / 60)} minutes` : '';
    await addSystemMessage(userId, network, 'info', `Connecting to IRC server${delayText}...`);

    ircMessageBuffer[userId + network] = [];

    courier.callNoWait(
        'connectionmanager', 'connect', {
            userId: userId,
            nick: nick,
            network: network,
            delay: delay ? delay : 0
        });
}

async function disconnect(userId, network) {
    await redis.hset(`networks:${userId}:${network}`, 'state', 'closing');

    courier.callNoWait('connectionmanager', 'disconnect', {
        userId: userId,
        network: network,
        reason: 'Session ended.'
    });
}

async function handleNoop() {
}

async function handleServerText(userId, msg, code) {
    // :mas.example.org 001 toyni :Welcome to the MAS IRC toyni
    let text = msg.params.join(' ');
    // 371, 372 and 375 = MOTD and INFO lines
    let cat = code === '372' || code === '375' || code === '371' ? 'banner' : 'server';

    if (text) {
        await addSystemMessage(userId, msg.network, cat, text);
    }
}

async function handle401(userId, msg) {
    // :irc.localhost 401 ilkka dadaa :No such nick/channel
    let targetUserId = await ircUser.getUserId(msg.params[0], msg.network);
    let conversation = await conversationFactory.findOrCreate1on1(
        userId, targetUserId, msg.network);

    await conversation.addMessage({
        userId: 'iSERVER',
        cat: 'error',
        body: `${msg.params[0]} is not in IRC.`
    });
}

async function handle043(userId, msg) {
    // :*.pl 043 AnDy 0PNEAKPLG :nickname collision, forcing nick change to your unique ID.
    let newNick = msg.params[0];
    let oldNick = msg.target;

    await updateNick(userId, msg.network, oldNick, newNick);
    await tryDifferentNick(userId, msg.network);
}

async function handle311(userId, msg) {
    // :irc.localhost 311 ilkka_ Mika7 ~Mika7 127.0.0.1 * :Real Name (Ralph v1.0)
    let nick = msg.params[0];
    let user = msg.params[1];
    let host = msg.params[2];
    let realName = msg.params[4];

    await addSystemMessage(userId, msg.network, 'server',
        `--- ${nick} is [${user}@${host}] (${realName})`);
}

async function handle312(userId, msg) {
    // :irc.localhost 312 ilkka_ Mika7 irc.localhost :Darwin ircd default configuration
    let server = msg.params[1];
    let serverInfo = msg.params[2];

    await addSystemMessage(userId, msg.network, 'server',
        `--- using server ${server} [${serverInfo}]`);
}

async function handle317(userId, msg) {
    // irc.localhost 317 ilkka_ Mika7 44082 1428703143 :seconds idle, signon time
    let idleTime = msg.params[1];
    let signonTime = new Date(parseInt(msg.params[2]) * 1000).toUTCString();

    await addSystemMessage(userId, msg.network, 'server',
        `--- has been idle ${idleTime} seconds. Signed on ${signonTime}`);
}

async function handle319(userId, msg) {
    // :irc.localhost 319 ilkka_ Mika7 :#portaali @#hemmot @#ilves #ceeassa
    let channels = msg.params[1];

    await addSystemMessage(userId, msg.network, 'server', `--- on channels ${channels}`);
}

async function handle332(userId, msg) {
    // :portaali.org 332 ilkka #portaali :Cool topic
    let channel = msg.params[0];
    let topic = msg.params[1];
    let conversation = await conversationFactory.findGroup(channel, msg.network);

    if (conversation) {
        await conversation.setTopic(topic, msg.target);
    }
}

async function handle353(userId, msg) {
    // :own.freenode.net 353 drwillie @ #evergreenproject :drwillie ilkkaoks
    let channel = msg.params[1];
    let conversation = await conversationFactory.findGroup(channel, msg.network);
    let names = msg.params[2].split(' ');

    if (conversation) {
        await bufferNames(names, userId, msg.network, conversation.conversationId);
    }
}

async function handle366(userId, msg) {
    // :pratchett.freenode.net 366 il3kkaoksWEB #testi1 :End of /NAMES list.
    let channel = msg.params[0];
    let conversation = await conversationFactory.findGroup(channel, msg.network);

    if (!conversation) {
        return;
    }

    let key = `namesbuffer:${userId}:${conversation.conversationId}`;
    let namesHash = await redis.hgetall(key);

    if (Object.keys(namesHash).length > 0) {
        // During the server boot-up or reconnect after a network outage it's very possible that
        // 366 replies get reordered if more than one mas user joins a same channel. Then an
        // older 366 reply (with fewer names on the list) is used to the reset the group members
        // data structure, which leads to incorrect bookkeeping. Ircnamesreporter check makes sure
        // only one 266 reply is parsed from a burst. For rest of the changes we rely on getting
        // incremental JOINS messages (preferably from the original reporter.) This leaves some
        // theoretical error edge cases (left as homework) that maybe are worth of fixing.
        let noActiveReporter = await redis.setnx(
            `ircnamesreporter:${conversation.conversationId}`, userId);

        if (noActiveReporter) {
            await redis.expire(`ircnamesreporter:${conversation.conversationId}`, 15); // 15s
            await conversation.setGroupMembers(namesHash);
        }
    }

    await redis.del(key);
}

async function handle376(userId, msg) {
    let state = await redis.hget(`networks:${userId}:${msg.network}`, 'state');

    await addSystemMessage(userId, msg.network, 'server', msg.params.join(' '));

    if (state !== 'connected') {
        await redis.hset(`networks:${userId}:${msg.network}`, 'state', 'connected');
        await resetRetryCount(userId, msg.network);

        await addSystemMessage(userId, msg.network, 'info', 'Connected to IRC server.');
        await addSystemMessage(userId, msg.network, 'info',
            'You can close this window at any time. It\'ll reappear when needed.');

        // Tell the client nick we got
        await redis.run('introduceNewUserIds', userId, null, null, true, userId);

        if (msg.network === 'Flowdock') {
            // TBD: The odd case of Flowdock, temporary
            sendPrivmsg(userId, 'Flowdock', 'NickServ', 'identify xx@example.com password');
            return;
        }

        let channelsToJoin = await redis.hgetall(
            `ircchannelsubscriptions:${userId}:${msg.network}`);

        if (!channelsToJoin) {
            log.info(userId, 'Connected, but no channels/1on1s to join. Disconnecting');
            await disconnect(userId, msg.network);
            return;
        }

        Object.keys(channelsToJoin).forEach(function(channel) {
            sendJoin(userId, msg.network, channel, channelsToJoin[channel]);
        });
    }
}

async function handle433(userId, msg) {
    // :mas.example.org 433 * ilkka :Nickname is already in use.
    await tryDifferentNick(userId, msg.network);
}

async function handle482(userId, msg) {
    // irc.localhost 482 ilkka #test2 :You're not channel operator
    let channel = msg.params[0];

    await addSystemMessage(
        userId, msg.network, 'error', 'You\'re not channel operator on ' + channel);
}

async function handleJoin(userId, msg) {
    // :neo!i=ilkkao@iao.iki.fi JOIN :#testi4
    let channel = msg.params[0];
    let network = msg.network;
    let targetUserId = await ircUser.getUserId(msg.nick, network);
    let conversation = await conversationFactory.findGroup(channel, network);
    let subscriptionsKey = `ircchannelsubscriptions:${userId}:${network}`;

    if (userId === targetUserId) {
        let password = await redis.hget(subscriptionsKey, channel.toLowerCase());

        if (password === null) {
            // ircchannelsubscriptions entry is missing. This means IRC server has added the user
            // to a channel without any action from the user. Flowdock at least does this.
            // ircchannelsubscriptions must be updated as it's used to rejoin channels after a
            // server restart.
            password = '';
            await redis.hset(subscriptionsKey, channel.toLowerCase(), password);
        }

        if (!conversation) {
            conversation = await conversationFactory.create({
                owner: msg.userId,
                type: 'group',
                name: channel,
                password: password,
                network: network
            });

            log.info(userId, 'First mas user joined channel: ' + network + ':' + channel);
        }

        let windowId = await window.findByConversation(userId, conversation);

        if (!windowId) {
            await window.create(userId, conversation.conversationId);
            await conversation.sendFullAddMembers(userId);
        }

        if (password) {
            // Conversation exists and this user used non empty password successfully to join
            // the channel. Update conversation password as it's possible that all other
            // mas users were locked out during a server downtime and conversation.password is
            // out of date.
            await conversation.setPassword(password);
        }
    }

    if (conversation) {
        await conversation.addGroupMember(targetUserId, 'u');
    }
}

async function handleJoinReject(userId, msg) {
    let channel = msg.params[0];
    let reason = msg.params[1];
    let conversation = await conversationFactory.findGroup(channel, msg.network);

    await addSystemMessage(userId, msg.network,
        'error', 'Failed to join ' + channel + '. Reason: ' + reason);

    await redis.hdel(`ircchannelsubscriptions:${userId}:${msg.network}`, channel.toLowerCase());

    if (conversation) {
        await conversation.removeGroupMember(userId, false, false);
    }

    await disconnectIfIdle(userId, msg.network);
}

async function handleQuit(userId, msg) {
    // :ilkka!ilkkao@localhost.myrootshell.com QUIT :"leaving"
    // let reason = msg.params[0];
    let targetUserId = await ircUser.getUserId(msg.nick, msg.network);
    let conversationIds = await window.getAllConversationIds(userId);

    for (let conversationId of conversationIds) {
        // TBD: Send a real quit message instead of part
        let conversation = await conversationFactory.get(conversationId);

        if (!conversation) {
            // TBD: Temporary, should be assert
            log.warn(userId, 'Conversation doesn\'t exist even it should.');
            continue;
        }

        if (conversation.network === msg.network && conversation.type === 'group') {
            // No need to check if the targetUser is on this channel,
            // removeGroupMember() is clever enough
            await conversation.removeGroupMember(targetUserId);
        }
    }
}

async function handleNick(userId, msg) {
    // :ilkkao!~ilkkao@localhost NICK :foobar
    let newNick = msg.params[0];
    let oldNick = msg.nick;

    await updateNick(userId, msg.network, oldNick, newNick);
}

async function handleError(userId, msg) {
    let reason = msg.params[0];

    await addSystemMessage(
        userId, msg.network, 'error', 'Connection lost. Server reason: ' + reason);

    if (reason.includes('Too many host connections')) {
        log.warn(userId, 'Too many connections to: ' + msg.network);

        await addSystemMessage(userId, msg.network, 'error',
            msg.network + ' IRC network doesn\'t allow more connections. ' +
            'Close all windows related to this IRC network and rejoin another day to try again.');

        // Disable auto-reconnect
        await redis.hset(`networks:${userId}:${msg.network}`, 'state', 'closing');
    }
}

async function handleInvite(userId, msg) {
    // :ilkkao!~ilkkao@127.0.0.1 INVITE buppe :#test2
    let channel = msg.params[1];

    await addSystemMessage(
        userId, msg.network, 'info', msg.nick + ' has invited you to channel ' + channel);
}

async function handleKick(userId, msg) {
    // :ilkkao!~ilkkao@127.0.0.1 KICK #portaali AnDy :no reason
    let channel = msg.params[0];
    let targetNick = msg.params[1];
    let reason = msg.params[2];

    let conversation = await conversationFactory.findGroup(channel, msg.network);
    let targetUserId = await ircUser.getUserId(targetNick, msg.network);

    if (conversation) {
        await conversation.removeGroupMember(targetUserId, false, true, reason);
    }

    if (targetUserId === userId) {
        // I was kicked
        await addSystemMessage(userId, msg.network,
            'error', 'You have been kicked from ' + channel + ', Reason: ' + reason);

        await disconnectIfIdle(userId, msg.network);
    }
}

async function handlePart(userId, msg) {
    // :ilkka!ilkkao@localhost.myrootshell.com PART #portaali :
    let channel = msg.params[0];
    let reason = msg.params[1];

    let conversation = await conversationFactory.findGroup(channel, msg.network);
    let targetUserId = await ircUser.getUserId(msg.nick, msg.network);

    if (conversation) {
        await conversation.removeGroupMember(targetUserId, false, false, reason);
    }
}

async function handleMode(userId, msg) {
    // :ilkka9!~ilkka9@localhost.myrootshell.com MODE #sunnuntai +k foobar3
    let target = msg.params[0];

    if (!isChannel(target)) {
        // TDB: Handle user's mode change
        return;
    }

    let conversation = await conversationFactory.findGroup(target, msg.network);

    if (!conversation) {
        return;
    }

    await conversation.addMessageUnlessDuplicate(userId, {
        cat: 'info',
        body: 'Mode change: ' + msg.params.join(' ') + ' by ' +
            (msg.nick ? msg.nick : msg.serverName)
    });

    let modeParams = msg.params.slice(1);

    while (modeParams.length !== 0) {
        let command = modeParams.shift();
        let oper = command.charAt(0);
        let modes = command.substring(1).split('');

        if (!(oper === '+' || oper === '-' )) {
            log.warn(userId, 'Received broken MODE command');
            continue;
        }

        for (let mode of modes) {
            let param;
            let newClass = null;
            let targetUserId = null;

            if (mode.match(/[klbeIOovq]/)) {
                param = modeParams.shift();

                if (!param) {
                    log.warn(userId, 'Received broken MODE command, parameter missing');
                    continue;
                } else if (mode.match(/[ov]/)) {
                    targetUserId = await ircUser.getUserId(param, msg.network);
                }
            }

            if (mode === 'o' && oper === '+') {
                // Got oper status
                newClass = OPER;
            } else if (mode === 'o' && oper === '-') {
                // Lost oper status
                newClass = USER;
            } else if (mode === 'v') {
                let oldClass = await conversation.getMemberRole(targetUserId);

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
                let newPassword = oper === '+' ? param : '';

                await conversation.setPassword(newPassword);
                await redis.hset(`ircchannelsubscriptions:${userId}:${msg.network}`,
                    target.toLowerCase(), newPassword);
            }

            if (newClass) {
                await conversation.setMemberRole(targetUserId, newClass);
            }
        }
    }
}

async function handleTopic(userId, msg) {
    // :ilkka!ilkkao@localhost.myrootshell.com TOPIC #portaali :My new topic
    let channel = msg.params[0];
    let topic = msg.params[1];
    let conversation = await conversationFactory.findGroup(channel, msg.network);

    if (conversation) {
        await conversation.setTopic(topic, msg.nick);
    }
}

async function handlePrivmsg(userId, msg, command) {
    // :ilkkao!~ilkkao@127.0.0.1 NOTICE buppe :foo
    let conversation;
    let sourceUserId;
    let target = msg.params[0];
    let text = msg.params[1];
    let cat = 'msg';
    let currentNick = await nicks.getCurrentNick(userId, msg.network);

    if (msg.nick) {
        sourceUserId = await ircUser.getUserId(msg.nick, msg.network);
    } else {
        // Message is from the server if the nick is missing
        sourceUserId = 'iSERVER';
    }

    if (text.includes('\u0001') && command === 'PRIVMSG') {
        let ret = parseCTCPMessage(text);
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
                userId: userId,
                network: msg.network,
                line: 'NOTICE ' + msg.nick + ' :' + reply
            });
            return;
        }
    }

    if (target.toLowerCase() === currentNick.toLowerCase()) {
        // Message is for the user only
        conversation = await conversationFactory.findOrCreate1on1(
            userId, sourceUserId, msg.network);
    } else {
        conversation = await conversationFactory.findGroup(target, msg.network);

        if (conversation === null) {
            // :verne.freenode.net NOTICE * :*** Got Ident response
            await addSystemMessage(userId, msg.network, 'info', text);
            return;
        }
    }

    await conversation.addMessageUnlessDuplicate(userId, {
        userId: sourceUserId,
        cat: cat,
        body: text
    });
}

async function updateNick(userId, network, oldNick, newNick) {
    let targetUserId = await redis.run('updateNick', userId, network, oldNick, newNick);

    if (targetUserId) {
        log.info(userId, 'I\'m first and handle ' + oldNick + ' -> ' + newNick + ' nick change.');

        // We haven't heard about this change before
        let conversations = await conversationFactory.getAllIncludingUser(targetUserId);

        for (let conversation of conversations) {
            if (conversation.network === network) {
                await conversation.addMessageUnlessDuplicate(userId, {
                    cat: 'info',
                    body: oldNick + ' is now known as ' + newNick
                });

                await conversation.sendUsers(targetUserId);
            }
        }
    }
}

async function tryDifferentNick(userId, network) {
    let nick = await redis.hget(`user:${userId}`, 'nick');
    let currentNick = await nicks.getCurrentNick(userId, network);

    if (nick !== currentNick.substring(0, nick.length)) {
        // Current nick is unique ID, let's try to change it to something unique immediately
        currentNick = nick + (100 + Math.floor((Math.random() * 900)));
    } else if (currentNick === nick) {
        // Second best choice
        currentNick = nick + '_';
    } else if (currentNick === nick + '_') {
        // Third best choice
        currentNick = nick + (Math.floor((Math.random() * 10)));
    } else {
        // If all else fails, keep adding random numbers
        currentNick = currentNick + (Math.floor((Math.random() * 10)));
    }

    await nicks.updateCurrentNick(userId, network, currentNick);

    courier.callNoWait('connectionmanager', 'write', {
        userId: userId,
        network: network,
        line: 'NICK ' + currentNick
    });
}

// TBD: Add a timer (every 15min?) to send one NAMES to every irc channel to make sure memberslist
// is in sync?

async function disconnectIfIdle(userId, network) {
    let windows = await window.getWindowForNetwork(userId, network);
    let onlyServer1on1Left = false;

    if (windows.length === 1) {
        // There's only one window left, is it IRC server 1on1?
        // If yes, we can disconnect from the server
        let lastConversationId = await window.getConversationId(userId, windowIds[0]);
        let lastConversation = await conversationFactory.get(lastConversationId);

        if (lastConversation.type === '1on1') {
            let peeruserId = await lastConversation.getPeerUserId(userId);

            if (peeruserId === 'iSERVER') {
                onlyServer1on1Left = true;
            }
        }
    }

    if (windowIds.length === 0 || onlyServer1on1Left) {
        await disconnect(userId, network);
    }

    if (onlyServer1on1Left) {
        await addSystemMessage(userId, network,
           'info', 'No open windows left for this network. Disconnected.');
    }
}

async function bufferNames(names, userId, network, conversationId) {
    let namesHash = {};

    for (let nick of names) {
        let userClass = USER;

        switch (nick.charAt(0)) {
            case '@':
                userClass = OPER;
                break;
            case '+':
                userClass = VOICE;
                break;
        }

        if (userClass === OPER || userClass === VOICE) {
            nick = nick.substring(1);
        }

        let memberUserId = await ircUser.getUserId(nick, network);
        namesHash[memberUserId] = userClass;
    }

    let key = 'namesbuffer:' + userId + ':' + conversationId;
    await redis.hmset(key, namesHash);
    await redis.expire(key, 60); // 1 minute. Does cleanup if we never get End of NAMES list reply.
}

function parseCTCPMessage(text) {
    // Follow http://www.irchelp.org/irchelp/rfc/ctcpspec.html
    let regex = /\u0001(.*?)\u0001/g;
    let matches;

    while ((matches = regex.exec(text))) {
        let msg = matches[1];
        let dataType;
        let payload = '';

        if (msg.includes(' ')) {
            dataType = msg.substr(0, msg.indexOf(' '));
            payload = msg.substr(msg.indexOf(' ') + 1);
        } else {
            dataType = msg;
        }

        // Only one CTCP extended message per PRIVMSG is supported for now
        return { type: dataType ? dataType : 'UNKNOWN', data: payload };
    }

    return { type: 'UNKNOWN' };
}

async function resetRetryCount(userId, network) {
    await redis.hset(`networks:${userId}:${network}`, 'retryCount', 0);
}

function isChannel(text) {
    return [ '&', '#', '+', '!' ].some(function(element) {
        return element === text.charAt(0);
    });
}

function sendPrivmsg(userId, network, target, text) {
    courier.callNoWait('connectionmanager', 'write', {
        userId: userId,
        network: network,
        line: 'PRIVMSG ' + target + ' :' + text
    });
}

function sendJoin(userId, network, channel, password) {
    courier.callNoWait('connectionmanager', 'write', {
        userId: userId,
        network: network,
        line: 'JOIN ' + channel + ' ' + password
    });
}

function sendIRCPart(userId, network, channel) {
    courier.callNoWait('connectionmanager', 'write', {
        userId: userId,
        network: network,
        line: 'PART ' + channel
    });
}
