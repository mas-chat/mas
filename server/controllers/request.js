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

/*jshint -W079 */

const co = require('co'),
      log = require('../lib/log'),
      redis = require('../lib/redis').createClient(),
      notification = require('../lib/notification'),
      search = require('../lib/search'),
      courier = require('../lib/courier').createEndPoint('command'),
      conversationFactory = require('../models/conversation'),
      window = require('../models/window'),
      nick = require('../models/nick'),
      friends = require('../models/friends'),
      ircUser = require('../backends/irc/ircUser');

const handlers = {
    SEND: handleSend,
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
    GET_CONVERSATION_LOG: handleGetConversationLog,
    REQUEST_FRIEND: handleRequestFriend,
    FRIEND_VERDICT: handleFriendVerdict,
    REMOVE_FRIEND: handleRemoveFriend
};

module.exports = function*(userId, sessionId, command) {
    let windowId = command.windowId;
    let network = command.network;

    let conversation = null;

    if (!isNaN(windowId)) {
        let conversationId = yield window.getConversationId(userId, windowId);
        conversation = yield conversationFactory.get(conversationId);
        network = conversation ? conversation.network : null;
    }

    let backend = network === 'MAS' ? 'loopbackparser' : 'ircparser';

    log.info(userId, 'Processing command: ' + JSON.stringify(command));

    // TBD: Check that windowId, network, and name are valid

    if (handlers[command.id]) {
        return yield handlers[command.id]({
            userId: userId,
            sessionId: sessionId,
            windowId: windowId,
            conversation: conversation,
            backend: backend,
            network: network,
            command: command
        });
    } else {
        log.warn(userId, `Reveiced unknown request: ${command.id}`);
    }
};

function *handleSend(params) {
    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    let gid = yield params.conversation.addMessageUnlessDuplicate(params.userId, {
        userId: params.userId,
        cat: 'msg',
        body: params.command.text
    }, params.sessionId);

    courier.callNoWait(params.backend, 'send', {
        userId: params.userId,
        conversationId: params.conversation.conversationId,
        text: params.command.text
    });

    return { status: 'OK', gid: gid };
}

function *handleCommand(params) {
    let userId = params.userId;
    let command = params.command.command;
    let commandParams = params.command.params;
    let targetUserId;

    switch (command) {
        case '1on1':
            targetUserId = yield nick.getUserIdFromNick(commandParams.trim(), 'MAS');

            if (!targetUserId) {
                return { status: 'ERROR', errorMsg: 'Unknown MAS nick.' };
            }

            return yield start1on1(userId, targetUserId, 'MAS');
        case 'ircquery':
            if (params.network === 'MAS') {
                return { status: 'ERROR', errorMsg: 'You can only use /ircquery on IRC window' };
            }

            targetUserId = yield ircUser.getUserId(commandParams.trim(), params.network);

            // 1on1s between MAS users are forced through loopback backend as multiple 1on1s between
            // same people via different networks isn't useful feature, just confusing.
            return yield start1on1(
                userId, targetUserId, targetUserId.charAt(0) === 'm' ? 'MAS' : params.network);
    }

    return yield courier.call(params.backend, 'textCommand', {
        userId: userId,
        conversationId: params.conversation.conversationId,
        command: command,
        commandParams: commandParams
    });
}

function *handleCreate(params) {
    /* jshint noyield:true */

    return yield courier.call('loopbackparser', 'create', {
        userId: params.userId,
        name: params.command.name,
        password: params.command.password
    });
}

function *handleJoin(params) {
    if (!params.command.name || !params.command.network) {
        return { status: 'PARAMETER_MISSING', errorMsg: 'Name or network missing.' };
    }

    let conversation = yield conversationFactory.findGroup(
        params.command.name, params.command.network);

    if (conversation) {
        let isMember = yield conversation.isMember(params.userId);

        if (isMember) {
            return { status: 'ALREADY_JOINED', errorMsg: 'You have already joined the group.' };
        }
    }

    return yield courier.call(params.backend, 'join', {
        userId: params.userId,
        network: params.command.network,
        name: params.command.name,
        password: params.command.password || '' // Normalize, no password is '', not null or false
    });
}

function *handleClose(params) {
    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    // Ask all sessions to close this window
    yield notification.broadcast(params.userId, {
        id: 'CLOSE',
        windowId: params.windowId
    });

    if (params.conversation.type === 'group') {
        yield params.conversation.removeGroupMember(params.userId);
    } else {
        yield params.conversation.remove1on1Member(params.userId);
    }

    // Backend specific cleanup
    courier.callNoWait(params.backend, 'close', {
        userId: params.userId,
        network: params.network,
        name: params.conversation.name,
        conversationType: params.conversation.type
    });

    return { status: 'OK' };
}

function *handleUpdate(params) {
    let accepted = [
        'visible',
        'row',
        'column',
        'sounds',
        'titleAlert',
        'minimizedNamesList',
        'desktop'
    ];

    let oldValues = yield redis.hgetall(`window:${params.userId}:${params.windowId}`);

    if (!oldValues) {
        log.warn(params.userId,
            'handleUpdate(): Client tried to update non-existent window, id: ' + params.windowId +
            ', command:' + params.command);
        return { status: 'ERROR' };
    }

    let update = false;

    for (let parameter of accepted) {
        let prop = params.command[parameter];

        if (typeof(prop) !== 'undefined' && prop !== oldValues[parameter]) {
            update = true;
            yield redis.hset(`window:${params.userId}:${params.windowId}`, parameter, prop);
        }
    }

    if (update) {
        // Notify all sessions. Undefined body properties won't appear in the JSON message
        yield notification.broadcast(params.userId, {
            id: 'UPDATE',
            windowId: params.windowId,
            visible: params.command.visible,
            row: params.command.row,
            column: params.command.column,
            sounds: params.command.sounds,
            titleAlert: params.command.titleAlert,
            minimizedNamesList: params.command.minimizedNamesList,
            desktop: params.command.desktop
        }, params.sessionId);
    }

    return { status: 'OK' };
}

function *handleUpdatePassword(params) {
    let password = params.command.password;

    // TBD: loopback backend: Validate the new password. No spaces, limit length etc.

    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    } else if (typeof password !== 'string') {
        return { status: 'ERROR', errorMsg: 'New password is invalid.' };
    } else if (params.conversation.type === '1on1') {
        return { status: 'ERROR', errorMsg: 'Can\'t set password for 1on1.' };
    }

    return yield courier.call(params.backend, 'updatePassword', {
        userId: params.userId,
        conversationId: params.conversation.conversationId,
        password: password
    });
}

function *handleUpdateTopic(params) {
    /* jshint noyield:true */

    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    return yield courier.call(params.backend, 'updateTopic', {
        userId: params.userId,
        conversationId: params.conversation.conversationId,
        topic: params.command.topic
    });
}

function *handleSet(params) {
    let properties = params.command.settings || {};

    const allowed = [ 'activeDesktop' ];

    for (let prop of Object.keys(properties)) {
        let value = properties[prop];

        if (allowed.indexOf(prop) === -1) {
            return { status: 'ERROR', errorMsg: `'${prop}' is not a valid settings property` };
        }

        // TBD: Re-factor when there are multiple settings
        if (yield window.isValidDesktop(params.userId, value)) {
            yield redis.hset(`settings:${params.userId}`, 'activeDesktop', properties[prop]);
        } else {
            return { status: 'ERROR', errorMsg: `Desktop '${value}' doesn't exist` };
        }
    }

    return { status: 'OK' };
}

function *handleChat(params) {
    let userId = params.userId;
    let targetUserId = params.command.userId;
    let network = 'MAS';

    if (targetUserId.charAt(0) !== 'm') {
        network = yield redis.hget(`ircuser:${targetUserId}`, 'network');
    }

    return yield start1on1(userId, targetUserId, network);
}

function *start1on1(userId, targetUserId, network) {
    if (!targetUserId || typeof targetUserId !== 'string') {
        return { status: 'ERROR', errorMsg: 'Malformed request.' };
    }

    if (userId === targetUserId) {
        return { status: 'ERROR', errorMsg: 'You can\'t chat with yourself.' };
    }

    let conversation = yield conversationFactory.findOrCreate1on1(userId, targetUserId, network);
    let existingWindow = yield window.findByConversationId(userId, conversation.conversationId);

    if (existingWindow) {
        return {
            status: 'ERROR',
            errorMsg: '1on1 chat window with this person is already open.'
        };
    } else {
        yield window.create(userId, conversation.conversationId);
    }

    return { status: 'OK' };
}

function *handleAckAlert(params) {
    let alertId = params.command.alertId;
    yield redis.srem(`activealerts:${params.userId}`, alertId);

    return { status: 'OK' };
}

function *handleLogout(params) {
    /* jshint noyield:true */

    log.info(params.userId, 'User ended session. SessionId: ' + params.sessionId);

    setTimeout(function() {
        // Give the system some time to deliver the acknowledgment before cleanup
        co(function*() {
            let last = yield redis.run('deleteSession', params.userId, params.sessionId);

            if (last) {
                yield friends.informStateChange(params.userId, 'logout');
            }
        })();
    }, 5000);

    return { status: 'OK' };
}

function *handleGetConversationLog(params) {
    let command = params.command;

    if (!params.conversation) {
        return { status: 'ERROR', errorMsg: 'Invalid windowId.' };
    }

    let conversationId = params.conversation.conversationId;
    let results = yield search.getMessagesForDay(conversationId, command.start, command.end);

    return { status: results === null ? 'ERROR' : 'OK', results: results };
}

function *handleRequestFriend(params) {
    let userId = params.userId;
    let requestorUserId = params.command.userId;
    let exists = yield redis.exists(`user:${requestorUserId}`);

    if (!exists) {
        return { status: 'ERROR', errorMsg: 'Unknown userId.' };
    }

    let existingFriend = yield redis.sismember(`friends:${userId}`, requestorUserId);

    if (existingFriend) {
        return { status: 'ERROR', errorMsg: 'This person is already on your contacts list.' };
    }

    yield redis.sadd(`friendsrequests:${requestorUserId}`, userId);
    yield friends.sendFriendConfirm(requestorUserId, params.sessionId);

    return { status: 'OK' };
}

function *handleFriendVerdict(params) {
    let userId = params.userId;
    let requestorUserId = params.command.userId;

    let removed = yield redis.srem(`friendsrequests:${userId}`, requestorUserId);

    if (removed === 0) {
        return { status: 'ERROR', errorMsg: 'Invalid userId.' };
    }

    if (params.command.allow) {
        yield redis.sadd(`friends:${userId}`, requestorUserId);
        yield redis.sadd(`friends:${requestorUserId}`, userId);

        // Inform both parties
        yield friends.sendFriends(requestorUserId);
        yield friends.sendFriends(userId);
    }

    return { status: 'OK' };
}

function *handleRemoveFriend(params) {
    if (!params.command.userId) {
        return { status: 'ERROR', errorMsg: 'Invalid userId.' };
    }

    yield redis.srem(`friends:${params.userId}`, params.command.userId);
    yield friends.sendFriends(params.userId);

    return { status: 'OK' };
}
