#!/usr/bin/env node --harmony
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

/*jshint -W079 */

require('../../lib/init')('irc');

var assert = require('assert'),
    co = require('co'),
    wait = require('co-wait'),
    log = require('../../lib/log'),
    redisModule = require('../../lib/redis'),
    redis = redisModule.createClient(),
    courier = require('../../lib/courier').createEndPoint('ircparser'),
    outbox = require('../../lib/outbox'),
    conversationFactory = require('../../models/conversation'),
    window = require('../../models/window'),
    nicks = require('../../models/nick'),
    ircUser = require('./ircUser');

const OPER = '@';
const VOICE = '+';
const USER = 'u';

var ircMessageBuffer = {};

co(function*() {
    yield redisModule.loadScripts();

    courier.on('send', processSend);
    courier.on('texCommand', processTextCommand);
    courier.on('join', processJoin);
    courier.on('close', processClose);
    courier.on('updatePassword', processUpdatePassword);
    courier.on('updateTopic', processUpdateTopic);
    courier.on('whois', processWhois);
    courier.on('chat', processChat);
    courier.on('restarted', processRestarted);
    courier.on('data', processData);
    courier.on('connected', processConnected);
    courier.on('disconnected', processDisconnected);
    courier.start();
})();

// Upper layer messages

function *processSend(params) {
    assert(params.conversationId);

    var conversation = yield conversationFactory.get(params.conversationId);

    if (!conversation) {
        return;
    }

    var target = conversation.name;

    if (conversation.type === '1on1') {
        var targetUserId = yield conversation.getPeerUserId(params.userId);
        target = yield redis.hget('ircuser:' + targetUserId, 'nick');
    }

    if (target) {
        courier.send('connectionmanager', {
            type: 'write',
            userId: params.userId,
            network: conversation.network,
            line: 'PRIVMSG ' + target + ' :' + params.text
        });
    }
}

function *processTextCommand(params) {
    var conversation = yield conversationFactory.get(params.conversationId);

    courier.send('connectionmanager', {
        type: 'write',
        userId: params.userId,
        network: conversation.network,
        line: params.text
    });
}

function *processJoin(params) {
    var state = yield redis.hget('networks:' + params.userId + ':' + params.network, 'state');
    var channelName = params.name;
    var hasChannelPrefixRegex = /^[&#!+]/;
    var illegalNameRegEx = /\s|\cG|,/; // See RFC2812, section 1.3

    if (!channelName || channelName === '' || illegalNameRegEx.test(channelName)) {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'JOIN_RESP',
            status: 'ERROR',
            errorMsg: 'Illegal or missing channel name.'
        });
        return;
    }

    if (!hasChannelPrefixRegex.test(channelName)) {
        channelName = '#' + channelName;
    }

    if (!state || state === 'disconnected' || state === 'closing') {
        yield redis.hset('ircpendingjoins:' +
            params.userId + ':' + params.network, channelName, params.password);
        yield connect(params.userId, params.network);
    } else if (state === 'connected') {
        courier.send('connectionmanager', {
            type: 'write',
            userId: params.userId,
            network: params.network,
            line: 'JOIN ' + channelName + ' ' + params.password
        });
    }

    yield outbox.queue(params.userId, params.sessionId, {
        id: 'JOIN_RESP',
        status: 'OK'
    });
}

function *processChat(params) {
    var conversation = yield conversationFactory.find1on1(
        params.userId, params.targetUserId, params.network);

    if (!conversation) {
        yield window.setup1on1(params.userId, params.targetUserId, params.network);
    }

    yield outbox.queue(params.userId, params.sessionId, {
        id: 'CHAT_RESP',
        status: 'OK'
    });
}

function *processClose(params) {
    var conversation = yield conversationFactory.get(params.conversationId);
    var state = yield redis.hget('networks:' + params.userId + ':' + conversation.network, 'state');

    if (state === 'connected' && conversation.type === 'group') {
        sendIRCPart(params.userId, conversation.network, conversation.name);
    }

    yield disconnectIfIdle(params.userId, conversation);
}

function *processUpdatePassword(params) {
    var conversation = yield conversationFactory.get(params.conversationId);
    var state = yield redis.hget(
        'networks:' + params.userId + ':' + conversation.network, 'state');
    var modeline = 'MODE ' + conversation.name + ' ';

    if (params.password === null) {
        modeline += '-k foobar'; // IRC protocol is odd, -k requires dummy parameter
    } else {
        modeline += '+k ' + params.password;
    }

    if (state !== 'connected') {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'UPDATE_PASSWORD_RESP',
            status: 'ERROR',
            errorMsg: 'Can\'t change the password. You are not connected to the IRC network'
        });
    } else {
        courier.send('connectionmanager', {
            type: 'write',
            userId: params.userId,
            network: conversation.network,
            line: modeline
        });

        yield outbox.queue(params.userId, params.sessionId, {
            id: 'UPDATE_PASSWORD_RESP',
            status: 'OK'
        });
    }
}

function *processUpdateTopic(params) {
    var conversation = yield conversationFactory.get(params.conversationId);
    var state = yield redis.hget(
        'networks:' + params.userId + ':' + conversation.network, 'state');

    if (state !== 'connected') {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'UPDATE_TOPIC_RESP',
            status: 'ERROR',
            errorMsg: 'Can\'t change the topic. You are not connected to the IRC network'
        });
    } else {
        courier.send('connectionmanager', {
            type: 'write',
            userId: params.userId,
            network: conversation.network,
            line: 'TOPIC ' + conversation.name + ' :' + params.topic
        });

        yield outbox.queue(params.userId, params.sessionId, {
            id: 'UPDATE_TOPIC_RESP',
            status: 'OK'
        });
    }
}

function processWhois(params) {
    courier.send('connectionmanager', {
        type: 'write',
        userId: params.userId,
        network: params.network,
        line: 'WHOIS ' + params.nick
    });
}

// Connection manager messages

// Restarted
function *processRestarted() {
    var allUsers = yield redis.smembers('userlist');

    for (var i = 0; i < allUsers.length; i++) {
        var userId = allUsers[i];
        var networks = yield window.getNetworks(userId);

        for (var ii = 0; ii < networks.length; ii++) {
            var network = networks[ii];

            if (network !== 'MAS') {
                log.info(userId, 'Scheduling connect() to IRC network: ' + network);

                yield addSystemMessage(userId, network, 'info',
                    'MAS Server restarted. Global rate limiting to avoid flooding IRC ' +
                    ' server enabled. Next connect will be slow.');

                yield connect(userId, network);
            }
        }
    }
}

// Data
function *processData(params) {
    var key = params.userId + params.network;

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
            yield parseIrcMessage(ircMessageBuffer[key][0]);
            ircMessageBuffer[key].shift();
        }
    }
}

// Connected
function *processConnected(params) {
    var user = yield redis.hgetall('user:' + params.userId);
    log.info(params.userId, 'Connected to IRC server');

    var commands = [
        'NICK ' + user.nick,
        'USER ' + user.nick + ' 8 * :Real Name (Ralph v1.0)'
    ];

    courier.send('connectionmanager', {
        type: 'write',
        userId: params.userId,
        network: params.network,
        line: commands
    });
}

// Disconnected
function *processDisconnected(params) {
    var userId = params.userId;
    var network = params.network;
    var previousState = yield redis.hget('networks:' + userId + ':' + network, 'state');

    yield redis.hset('networks:' + userId + ':' + network, 'state', 'disconnected');
    yield nicks.removeCurrentNick(userId, network);

    yield redis.del('ircpendingjoins:' + userId + ':' + network);

    if (previousState === 'closing') {
        // We wanted to close the connection, don't reconnect
        return;
    }

    var delay = 30 * 1000; // 30s
    var msg = 'Lost connection to IRC server (' + params.reason + '). Will try to reconnect in ';
    var count = yield redis.hincrby('networks:' + userId + ':' + network, 'retryCount', 1);

    // Set the backoff timer
    if (count < 4) {
        msg = msg + '30 seconds.';
    } else if (count < 8) {
        delay = 3 * 60 * 1000; // 3 mins
        msg = msg + '3 minutes.';
    } else if (count >= 8) {
        delay = 60 * 60 * 1000; // 1 hour
        msg = 'Error in connection to IRC server after multiple attempts. Waiting one hour ' +
            'before making another connection attempt. Close all windows related to this ' +
            'IRC network if you do not wish to retry.';
    }

    yield addSystemMessage(userId, network, 'error', msg);
    yield wait(delay);
    yield connect(params.userId, params.network, true);
}

function *parseIrcMessage(params) {
    var line = params.line.trim(),
        parts = line.split(' '),
        msg = {
            params: [],
            network: params.network,
            serverName: null,
            nick: null,
            userNameAndHost: null
        };

    // See rfc2812

    if ((line.charAt(0) === ':')) {
        // Prefix exists
        var prefix = parts.shift();

        var nickEnds = prefix.indexOf('!');
        var identEnds = prefix.indexOf('@');

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

    var handler = handlers[msg.command];

    if (!handler && !isNaN(msg.command)) {
        // Default handler for all numeric replies
        handler = handleServerText;
    }

    if (handler) {
        yield handler(params.userId, msg, msg.command);
    }
}

function *addSystemMessage(userId, network, cat, body) {
    var conversation = yield conversationFactory.find1on1(userId, 'iSERVER', network);

    if (!conversation) {
        conversation = yield window.setup1on1(userId, 'iSERVER', network);
    }

    yield conversation.addMessage({
        userId: 'iSERVER',
        cat: cat,
        body: body
    });
}

function *connect(userId, network, skipRetryCountReset) {
    var nick = yield redis.hget('user:' + userId, 'nick');
    yield nicks.updateCurrentNick(userId, network, nick);

    yield redis.hset('networks:' + userId + ':' + network, 'state', 'connecting');

    if (!skipRetryCountReset) {
        yield resetRetryCount(userId, network);
    }

    yield addSystemMessage(userId, network, 'info', 'Connecting to IRC server...');
    ircMessageBuffer[userId + network] = [];

    courier.send('connectionmanager', {
        type: 'connect',
        userId: userId,
        nick: nick,
        network: network
    });
}

function *disconnect(userId, network) {
    yield redis.hset('networks:' + userId + ':' + network, 'state', 'closing');

    courier.send('connectionmanager', {
        type: 'write',
        userId: userId,
        network: network,
        line: 'QUIT :Session ended.'
    });

    courier.send('connectionmanager', {
        type: 'disconnect',
        userId: userId,
        network: network
    });
}

// Process different IRC commands

var handlers = {
    '043': handle043,
    332: handle332,
    333: handleNoop, // RPL_TOPICWHOTIME: No good place to show
    353: handle353,
    366: handle366,
    376: handle376,
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

function *handleNoop() {
    /* jshint noyield:true */
}

function *handleServerText(userId, msg, code) {
    // :mas.example.org 001 toyni :Welcome to the MAS IRC toyni
    var text = msg.params.join(' ');
    // 371, 372 and 375 = MOTD and INFO lines
    var cat = code === '372' || code === '375' || code === '371' ? 'banner' : 'server';

    if (text) {
        yield addSystemMessage(userId, msg.network, cat, text);
    }
}

function *handle043(userId, msg) {
    // :*.pl 043 AnDy 0PNEAKPLG :nickname collision, forcing nick change to your unique ID.
    var newNick = msg.params[0];
    var oldNick = msg.target;

    yield updateNick(userId, msg.network, oldNick, newNick);
    yield tryDifferentNick(userId, msg.network);
}

function *handle332(userId, msg) {
    // :portaali.org 332 ilkka #portaali :Cool topic
    var channel = msg.params[0];
    var topic = msg.params[1];
    var conversation = yield conversationFactory.findGroup(channel, msg.network);

    if (conversation) {
        yield conversation.setTopic(topic);
    }
}

function *handle353(userId, msg) {
    // :own.freenode.net 353 drwillie @ #evergreenproject :drwillie ilkkaoks
    var channel = msg.params[1];
    var conversation = yield conversationFactory.findGroup(channel, msg.network);
    var names = msg.params[2].split(' ');

    if (conversation) {
        yield bufferNames(names, userId, msg.network, conversation.conversationId);
    }
}

function *handle366(userId, msg) {
    // :pratchett.freenode.net 366 il3kkaoksWEB #testi1 :End of /NAMES list.
    var channel = msg.params[0];
    var conversation = yield conversationFactory.findGroup(channel, msg.network);
    var key = 'namesbuffer:' + userId + ':' + conversation.conversationId;

    var namesHash = yield redis.hgetall(key);
    yield redis.del(key);

    if (conversation && Object.keys(namesHash).length > 0) {
        // During the server bootup or reconnect after a network outage it's very possible that
        // 366 replies get reordered if more than one mas user joins a same channel. Then an
        // older 366 reply (with fewer names on the list) is used to the reset the group members
        // data structure, which leads to incorrect bookkeeping. Ircnamesreporter check makes sure
        // only one 266 reply is parsed from a burst. For rest of the changes we rely on getting
        // incremental JOINS messages (preferrably from the original reporter.) This leaves some
        // theoretical error edge cases (left as homework) that maybe are worth of fixing.
        var noActiveReporter = yield redis.setnx(
            'ircnamesreporter:' + conversation.conversationId, userId);

        if (noActiveReporter) {
            yield redis.expire('ircnamesreporter:' + conversation.conversationId, 15); // 15s
            yield conversation.setGroupMembers(namesHash);
        }
    }
}

function *handle376(userId, msg) {
    var state = yield redis.hget('networks:' + userId + ':' + msg.network, 'state');

    yield addSystemMessage(userId, msg.network, 'server', msg.params.join(' '));

    if (state !== 'connected') {
        yield redis.hset('networks:' + userId + ':' + msg.network, 'state', 'connected');
        yield resetRetryCount(userId, msg.network);

        yield addSystemMessage(userId, msg.network, 'info', 'Connected to IRC server.');
        yield addSystemMessage(userId, msg.network, 'info',
            'You can close this window at any time. It\'ll reappear when needed.');

        var conversationIds = yield window.getAllConversationIds(userId);
        var channelsToJoin = yield redis.hgetall('ircpendingjoins:' + userId + ':' + msg.network);

        // Password is needed when join completes if this is a new conversation
        yield redis.expire('ircpendingjoins:' + userId + ':' + msg.network, 60);

        channelsToJoin = channelsToJoin || {};

        // Merge ircpendingjoins (new channels this user is joining now) with all 'old' channels
        // we need to join because of server restart or network hiccup.
        for (var i = 0; i < conversationIds.length; i++) {
            var ircConversation = yield conversationFactory.get(conversationIds[i]);

            if (ircConversation.network === msg.network && ircConversation.type === 'group') {
                channelsToJoin[ircConversation.name] = ircConversation.password;
            }
        }

        if (channelsToJoin.length === 0) {
            log.info(userId, 'Connected, but no channels/1on1s to join. Disconnecting');
            yield disconnect(userId, msg.network);
            return;
        }

        // TBD: Some duplication with processJoin()
        Object.keys(channelsToJoin).forEach(function(channel) {
            courier.send('connectionmanager', {
                type: 'write',
                userId: userId,
                network: msg.network,
                line: 'JOIN ' + channel + ' ' + channelsToJoin[channel]
            });
        });

        yield nicks.sendNickAll(userId);
    }
}

function *handle433(userId, msg) {
    // :mas.example.org 433 * ilkka :Nickname is already in use.
    yield tryDifferentNick(userId, msg.network);
}

function *handle482(userId, msg) {
    // irc.localhost 482 ilkka #test2 :You're not channel operator
    var channel = msg.params[0];

    yield addSystemMessage(
        userId, msg.network, 'error', 'You\'re not channel operator on ' + channel);
}

function *handleJoin(userId, msg) {
    // :neo!i=ilkkao@iao.iki.fi JOIN :#testi4
    var channel = msg.params[0];
    var targetUserId = yield ircUser.getUserId(msg.nick, msg.network);
    var conversation = yield conversationFactory.findGroup(channel, msg.network);
    var password = yield redis.hget('ircpendingjoins:' + userId + ':' + msg.network, channel);

    if (!conversation) {
        conversation = yield conversationFactory.create({
            owner: msg.userId,
            type: 'group',
            name: channel,
            password: password,
            network: msg.network
        });

        log.info(userId, 'First mas user joined channel: ' + msg.network + ':' + channel);
    } else if (password) {
        // Conversation exists and this user used non empty password successfully to join
        // the channel. Update conversation password as it's possible that all other
        // mas users were locked out during a server downtime and conversation.password is
        // out of date.
        yield conversation.setPassword(password);
    }

    if (userId === targetUserId) {
        var windowId = yield window.findByConversationId(userId, conversation.conversationId);

        if (!windowId) {
            yield window.create(userId, conversation.conversationId);
            yield conversation.sendAddMembers(userId);
        }
    }

    yield conversation.addGroupMember(targetUserId, 'u');
}

function *handleJoinReject(userId, msg) {
    var channel = msg.params[0];
    var reason = msg.params[1];
    var conversation = yield conversationFactory.findGroup(channel, msg.network);

    yield addSystemMessage(userId, msg.network,
        'error', 'Failed to join ' + channel + '. Reason: ' + reason);

    if (conversation) {
        yield conversation.removeGroupMember(userId, false, false);

        var windowId = yield window.findByConversationId(userId, conversation.conversationId);

        if (windowId) {
            yield window.remove(userId, windowId);
        }
    }

    yield disconnectIfIdle(userId, conversation);
}

function *handleQuit(userId, msg) {
    // :ilkka!ilkkao@localhost.myrootshell.com QUIT :"leaving"
    // var reason = msg.params[0];
    var targetUserId = yield ircUser.getUserId(msg.nick, msg.network);

    var conversationIds = yield window.getAllConversationIdsWithUserId(userId, targetUserId);

    for (var i = 0; i < conversationIds.length; i++) {
        // TBD: Send a real quit message instead of part
        var conversation = yield conversationFactory.get(conversationIds[i]);
        yield conversation.removeGroupMember(targetUserId);
    }
}

function *handleNick(userId, msg) {
    // :ilkkao!~ilkkao@localhost NICK :foobar
    var newNick = msg.params[0];
    var oldNick = msg.nick;

    yield updateNick(userId, msg.network, oldNick, newNick);
}

function *handleError(userId, msg) {
    var reason = msg.params[0];

    yield addSystemMessage(
        userId, msg.network, 'error', 'Connection lost. Server reason: ' + reason);

    if (reason.indexOf('Too many host connections') !== -1) {
        log.error(userId, 'Too many connections to: ' + msg.network);

        yield addSystemMessage(userId, msg.network, 'error',
            msg.network + ' IRC network doesn\'t allow more connections. ' +
            'Close this window and rejoin to try again.');

        // Disable auto-reconnect
        yield redis.hset('networks:' + userId + ':' + msg.network, 'state', 'closing');
    }
}

function *handleInvite(userId, msg) {
    // :ilkkao!~ilkkao@127.0.0.1 INVITE buppe :#test2
    var channel = msg.params[1];

    yield addSystemMessage(
        userId, msg.network, 'info', msg.nick + ' has invited you to channel ' + channel);
}

function *handleKick(userId, msg) {
    // :ilkkao!~ilkkao@127.0.0.1 KICK #portaali AnDy :no reason
    var channel = msg.params[0];
    var targetNick = msg.params[1];
    var reason = msg.params[2];

    var conversation = yield conversationFactory.findGroup(channel, msg.network);
    var targetUserId = yield ircUser.getUserId(targetNick, msg.network);

    if (conversation) {
        yield conversation.removeGroupMember(targetUserId, false, true, reason);
    }

    if (targetUserId === userId) {
        // I was kicked
        yield addSystemMessage(userId, msg.network,
            'error', 'You have been kicked from ' + channel + ', Reason: ' + reason);

        var windowId = yield window.findByConversationId(userId, conversation.conversationId);
        yield window.remove(userId, windowId);

        yield disconnectIfIdle(userId, conversation);
    }
}

function *handlePart(userId, msg) {
    // :ilkka!ilkkao@localhost.myrootshell.com PART #portaali :
    var channel = msg.params[0];
    var reason = msg.params[1];

    var conversation = yield conversationFactory.findGroup(channel, msg.network);
    var targetUserId = yield ircUser.getUserId(msg.nick, msg.network);

    if (conversation) {
        yield conversation.removeGroupMember(targetUserId, false, false, reason);
    }
}

function *handleMode(userId, msg) {
    // :ilkka9!~ilkka9@localhost.myrootshell.com MODE #sunnuntai +k foobar3
    var target = msg.params[0];

    if (!isChannel(target)) {
        // TDB: Handle user's mode change
        return;
    }

    var conversation = yield conversationFactory.findGroup(target, msg.network);

    if (!conversation) {
        return;
    }

    yield conversation.addMessageUnlessDuplicate(userId, {
        cat: 'info',
        body: 'Mode change: ' + msg.params.join(' ') + ' by ' +
            (msg.nick ? msg.nick : msg.serverName)
    });

    var modeParams = msg.params.slice(1);

    while (modeParams.length !== 0) {
        var command = modeParams.shift();
        var oper = command.charAt(0);
        var modes = command.substring(1).split('');
        var param;

        if (!(oper === '+' || oper === '-' )) {
            log.warn(userId, 'Received broken MODE command');
            continue;
        }

        for (var i = 0; i < modes.length; i++) {
            var mode = modes[i];
            var newClass = null;

            if (mode.match(/[klbeIOov]/)) {
                param = modeParams.shift();

                if (!param) {
                    log.warn(userId, 'Received broken MODE command');
                }
            }

            var targetUserId = yield ircUser.getUserId(param, msg.network);

            if (mode === 'o' && oper === '+') {
                // Got oper status
                newClass = OPER;
            } else if (mode === 'o' && oper === '-') {
                // Lost oper status
                newClass = USER;
            } else if (mode === 'v') {
                var oldClass = yield conversation.getMemberRole(targetUserId);

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
                yield conversation.setPassword(oper === '+' ? param : '');
            }

            if (newClass) {
                yield conversation.setMemberRole(targetUserId, newClass);
            }
        }
    }
}

function *handleTopic(userId, msg) {
    // :ilkka!ilkkao@localhost.myrootshell.com TOPIC #portaali :My new topic
    var channel = msg.params[0];
    var topic = msg.params[1];
    var conversation = yield conversationFactory.findGroup(channel, msg.network);

    if (conversation) {
        yield conversation.setTopic(topic, msg.nick);
    }
}

function *handlePrivmsg(userId, msg, command) {
    // :ilkkao!~ilkkao@127.0.0.1 NOTICE buppe :foo
    var conversation;
    var sourceUserId;
    var target = msg.params[0];
    var text = msg.params[1];
    var cat = 'msg';
    var currentNick = yield nicks.getCurrentNick(userId, msg.network);

    if (msg.nick) {
        sourceUserId = yield ircUser.getUserId(msg.nick, msg.network);
    } else {
        // Message is frm the server if the nick is missing
        sourceUserId = 'iSERVER';
    }

    if (text.indexOf('\u0001') !== -1 && command === 'PRIVMSG') {
        var ret = parseCTCPMessage(text);
        var reply = false;

        if (ret.type === 'ACTION') {
            cat = 'action';
            text = ret.data;
        } else if (ret.type === 'VERSION') {
            reply = '\u0001VERSION masclient:0.8.0:Linux\u0001';
        } else if (ret.type === 'PING') {
            reply = text;
        }

        if (reply) {
            courier.send('connectionmanager', {
                type: 'write',
                userId: userId,
                network: msg.network,
                line: 'NOTICE ' + msg.nick + ' :' + reply
            });
            return;
        }
    }

    if (target === currentNick) {
        // Message is for the user only
        conversation = yield conversationFactory.find1on1(userId, sourceUserId, msg.network);

        if (conversation === null) {
            conversation = yield window.setup1on1(userId, sourceUserId, msg.network);
        }
    } else {
        conversation = yield conversationFactory.findGroup(target, msg.network);

        if (conversation === null) {
            log.warn(userId, 'Message arrived for an unknown channel');
            return;
        } else if (sourceUserId.charAt(0) === 'm') {
            // Message from internal user is processed already
            return;
        }
    }

    yield conversation.addMessageUnlessDuplicate(userId, {
        userId: sourceUserId,
        cat: cat,
        body: text
    });
}

function *updateNick(userId, network, oldNick, newNick) {
    var targetUserId = yield redis.run('updateNick', userId, network, oldNick, newNick);

    if (targetUserId) {
        log.info(userId, 'I\'m first and handle ' + oldNick + ' -> ' + newNick + ' nick change.');

        // We havent heard about this change before
        var conversationIds = yield window.getAllConversationIdsWithUserId(userId, targetUserId);

        for (var i = 0; i < conversationIds.length; i++) {
            var conversation = yield conversationFactory.get(conversationIds[i]);
            yield conversation.addMessageUnlessDuplicate(userId, {
                cat: 'info',
                body: oldNick + ' is now known as ' + newNick
            });
            yield conversation.sendUsers(targetUserId);
        }
    }
}

function *tryDifferentNick(userId, network) {
    var nick = yield redis.hget('user:' + userId, 'nick');
    var currentNick = yield nicks.getCurrentNick(userId, network);

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

    yield nicks.updateCurrentNick(userId, network, currentNick);

    courier.send('connectionmanager', {
        type: 'write',
        userId: userId,
        network: network,
        line: 'NICK ' + currentNick
    });
}

// TBD: Add a timer (every 15min?) to send one NAMES to every irc channel to make sure memberslist
// is in sync?

function sendIRCPart(userId, network, channel) {
    courier.send('connectionmanager', {
        type: 'write',
        userId: userId,
        network: network,
        line: 'PART ' + channel
    });
}

function *disconnectIfIdle(userId, conversation) {
    var windowIds = yield window.getWindowIdsForNetwork(userId, conversation.network);
    var onlyServer1on1Left = false;

    if (windowIds.length === 1) {
        // There's only one window left, is it IRC server 1on1?
        // If yes, we can disconnect from the server
        var lastConversationId = yield window.getConversationId(userId, windowIds[0]);
        var lastConversation = yield conversationFactory.get(lastConversationId);

        if (lastConversation.type === '1on1') {
            var peeruserId = yield lastConversation.getPeerUserId(userId);

            if (peeruserId === 'iSERVER') {
                onlyServer1on1Left = true;
            }
        }
    }

    if (windowIds.length === 0 || onlyServer1on1Left) {
        yield addSystemMessage(userId, conversation.network,
            'info', 'No open windows left for this network, disconnecting...');
        yield disconnect(userId, conversation.network);
    }
}

function *bufferNames(names, userId, network, conversationId) {
    var namesHash = {};

    for (var i = 0; i < names.length; i++) {
        var nick = names[i];
        var userClass = USER;

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

        var memberUserId = yield ircUser.getUserId(nick, network);
        namesHash[memberUserId] = userClass;
    }

    var key = 'namesbuffer:' + userId + ':' + conversationId;
    yield redis.hmset(key, namesHash);
    yield redis.expire(key, 60); // 1 minute. Does cleanup if we never get End of NAMES list reply.
}

function parseCTCPMessage(text) {
    // Follow http://www.irchelp.org/irchelp/rfc/ctcpspec.html
    var regex = /\u0001(.*?)\u0001/g;
    var matches;

    /*jshint -W084 */
    while (matches = regex.exec(text)) {
        var msg = matches[1];
        var dataType;
        var payload = '';

        if (msg.indexOf(' ') === -1) {
            dataType = msg;
        } else {
            dataType = msg.substr(0, msg.indexOf(' '));
            payload = msg.substr(msg.indexOf(' ') + 1);
        }

        // Only one CTCP extended message per PRIVMSG is supported for now
        return { type: dataType ? dataType : 'UNKNOWN', data: payload };
    }
    /*jshint +W084 */
}

function *resetRetryCount(userId, network) {
    yield redis.hset('networks:' + userId + ':' + network, 'retryCount', 0);
}

function isChannel(text) {
    return [ '&', '#', '+', '!' ].some(function(element) {
        return element === text.charAt(0);
    });
}
