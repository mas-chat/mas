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

const assert = require('assert'),
      co = require('co'),
      log = require('../lib/log'),
      redis = require('../lib/redis').createClient(),
      outbox = require('../lib/outbox'),
      search = require('../lib/search'),
      courier = require('../lib/courier').createEndPoint('command'),
      conversationFactory = require('../models/conversation'),
      window = require('../models/window'),
      friends = require('../models/friends');

const handlers = {
    SEND: handleSend,
    CREATE: handleCreate,
    JOIN: handleJoin,
    CLOSE: handleClose,
    UPDATE: handleUpdate,
    UPDATE_PASSWORD: handleUpdatePassword,
    UPDATE_TOPIC: handleUpdateTopic,
    SET: handleSet,
    WHOIS: handleWhois,
    CHAT: handleChat,
    ACKALERT: handleAckAlert,
    LOGOUT: handleLogout,
    GET_CONVERSATION_LOG: handleGetConversationLog,
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
        yield handlers[command.id]({
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
        return;
    }

    if (params.command.text.charAt(0) === '/') {
        courier.send(params.backend, {
            type: 'texCommand',
            userId: params.userId,
            sessionId: params.sessionId,
            conversationId: params.conversation.conversationId,
            text: params.command.text.substring(1)
        });
        return;
    } else {
        yield params.conversation.addMessageUnlessDuplicate(params.userId, {
            userId: params.userId,
            cat: 'msg',
            body: params.command.text
        }, params.sessionId);

        courier.send(params.backend, {
            type: 'send',
            userId: params.userId,
            sessionId: params.sessionId,
            conversationId: params.conversation.conversationId,
            text: params.command.text
        });
    }

    yield outbox.queue(params.userId, params.sessionId, {
        id: 'SEND_RESP',
        status: 'OK'
    });
}

function *handleCreate(params) {
    /* jshint noyield:true */

    courier.send('loopbackparser', {
        type: 'create',
        userId: params.userId,
        sessionId: params.sessionId,
        name: params.command.name,
        password: params.command.password
    });
}

function *handleJoin(params) {
    if (!params.command.name || !params.command.network) {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'JOIN_RESP',
            status: 'PARAMETER_MISSING',
            errorMsg: 'Name or network missing.'
        });
        return;
    }

    let conversation = yield conversationFactory.findGroup(
        params.command.name, params.command.network);

    if (conversation) {
        let isMember = yield conversation.isMember(params.userId);

        if (isMember) {
            yield outbox.queue(params.userId, params.sessionId, {
                id: 'JOIN_RESP',
                status: 'ALREADY_JOINED',
                errorMsg: 'You have already joined the group.'
            });
            return;
        }
    }

    courier.send(params.backend, {
        type: 'join',
        userId: params.userId,
        sessionId: params.sessionId,
        network: params.command.network,
        name: params.command.name,
        password: params.command.password || '' // Normalize, no password is '', not null or false
    });
}

function *handleClose(params) {
    if (!params.conversation) {
        return;
    }

    // Ask all sessions to close this window
    yield outbox.queueAll(params.userId, {
        id: 'CLOSE',
        windowId: params.windowId
    });

    if (params.conversation.type === 'group') {
        yield params.conversation.removeGroupMember(params.userId);
    } else {
        yield params.conversation.remove1on1Member(params.userId);
    }

    yield window.remove(params.userId, params.windowId);

    // Backend specific cleanup
    courier.send(params.backend, {
        type: 'close',
        userId: params.userId,
        network: params.network,
        name: params.conversation.name,
        conversationType: params.conversation.type
    });
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
        return;
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
        yield outbox.queueAll(params.userId, {
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
}

function *handleUpdatePassword(params) {
    if (!params.conversation) {
        return;
    }

    let password = params.command.password;

    // TBD: loopback backend: Validate the new password. No spaces, limit length etc.
    if (typeof password !== 'string') {
        yield respondError('UPDATE_PASSWORD_RESP', params.userId, params.sessionId,
            'New password is invalid.');
        return;
    } else if (params.conversation.type === '1on1') {
        yield respondError('UPDATE_PASSWORD_RESP', params.userId, params.sessionId,
            'Can\'t set password for 1on1.');
        return;
    }

    courier.send(params.backend, {
        type: 'updatePassword',
        userId: params.userId,
        conversationId: params.conversation.conversationId,
        password: password
    });

    yield outbox.queue(params.userId, params.sessionId, {
        id: 'UPDATE_PASSWORD_RESP',
        status: 'OK'
    });
}

function *handleUpdateTopic(params) {
    /* jshint noyield:true */

    if (!params.conversation) {
        return;
    }

    courier.send(params.backend, {
        type: 'updateTopic',
        userId: params.userId,
        conversationId: params.conversation.conversationId,
        topic: params.command.topic
    });
}

function *handleSet(params) {
    let properties = params.command.settings || {};
    let error = false;

    const allowed = [ 'activeDesktop' ];

    for (let prop of Object.keys(properties)) {
        let value = properties[prop];

        if (allowed.indexOf(prop) === -1) {
            yield respondError('SET_RESP', params.userId, params.sessionId,
                `'${prop}' is not a valid property`);
            error = true;
            break;
        }

        // TBD: Re-factor when there are multiple settings
        if (!isNaN(value)) {
            if (yield window.isValidDesktop(params.userId, value)) {
                yield redis.hset(`settings:${params.userId}`, 'activeDesktop', properties[prop]);
            } else {
                yield respondError('SET_RESP', params.userId, params.sessionId,
                    `Desktop '${value}' doesn't exist`);
                error = true;
            }
        }
    }

    if (!error) {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'SET_RESP',
            status: 'OK'
        });
    }
}

function *handleWhois(params) {
    /* jshint noyield:true */

    courier.send(params.backend, {
        type: 'whois',
        userId: params.userId,
        network: params.network,
        nick: params.command.nick
    });
}

function *handleChat(params) {
    let userId = params.userId;
    let targetUserId = params.command.userId;
    let network = 'MAS';

    // TDB: Refactor to a method
    if (targetUserId.charAt(0) === 'm') {
        // 1on1s between MAS users are forced through MAS
        params.backend = 'loopbackparser';
    } else {
        network = yield redis.hget(`ircuser:${targetUserId}`, 'network');
    }

    if (!targetUserId || typeof targetUserId !== 'string') {
        yield respondError('CHAT_RESP', userId, params.sessionId, 'Malformed request.');
        return;
    }

    if (userId === targetUserId) {
        yield respondError('CHAT_RESP', userId, params.sessionId, 'You can\'t chat with yourself.');
        return;
    }

    let conversation = yield conversationFactory.find1on1(userId, targetUserId, network);

    if (conversation) {
        assert(conversation.members[userId]);

        let existingWindow = yield window.findByConversationId(userId, conversation.conversationId);

        if (existingWindow) {
            yield respondError('CHAT_RESP', userId, params.sessionId,
                '1on1 chat window with this person is already open.');
            return;
        } else {
            yield window.create(userId, conversation.conversationId);
        }
    } else {
        yield window.setup1on1(userId, targetUserId, network);
    }

    courier.send(params.backend, {
        type: 'chat',
        userId: userId,
        network: network,
        targetUserId: targetUserId
    });
}

function *handleAckAlert(params) {
    let alertId = params.command.alertId;

    yield redis.srem(`activealerts:${params.userId}`, alertId);

    yield outbox.queue(params.userId, params.sessionId, {
        id: 'ACKALERT_RESP',
        status: 'OK'
    });
}

function *handleLogout(params) {
    log.info(params.userId, 'User ended session. SessionId: ' + params.sessionId);

    yield outbox.queue(params.userId, params.sessionId, {
        id: 'LOGOUT_RESP'
    });

    setTimeout(function() {
        // Give the system some time to deliver LOGOUT_RESP before cleanup
        co(function*() {
            let last = yield redis.run('deleteSession', params.userId, params.sessionId);

            if (last) {
                yield friends.informStateChange(params.userId, 'logout');
            }
        })();
    }, 5000);
}

function *handleGetConversationLog(params) {
    let command = params.command;

    if (!params.conversation) {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'GET_CONVERSATION_LOG_RESP',
            status: 'ERROR'
        });
        return;
    }

    let conversationId = params.conversation.conversationId;

    search.getMessagesForDay(conversationId, command.start, command.end, function(results) {
        co(function*() {
            yield outbox.queue(params.userId, params.sessionId, {
                id: 'GET_CONVERSATION_LOG_RESP',
                status: results === null ? 'ERROR' : 'OK',
                results: results
            });
        })();
    });
}

function *handleRemoveFriend(params) {
    if (!params.command.userId) {
        return;
    }

    yield outbox.queue(params.userId, params.sessionId, {
        id: 'REMOVE_FRIEND_RESP',
        status: 'OK'
    });

    yield redis.srem(`friends:${params.userId}`, params.command.userId);
    yield friends.sendFriends(params.userId);
}

function *respondError(resp, userId, sessionId, msg, errorStatus) {
    yield outbox.queue(userId, sessionId, {
        id: resp,
        status: errorStatus || 'ERROR',
        errorMsg: msg
    });
}
