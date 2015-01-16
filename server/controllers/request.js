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

var assert = require('assert'),
    co = require('co'),
    log = require('../lib/log'),
    redis = require('../lib/redis').createClient(),
    outbox = require('../lib/outbox'),
    courier = require('../lib/courier').createEndPoint('command'),
    conversationFactory = require('../models/conversation'),
    window = require('../models/window'),
    friends = require('../models/friends');

var handlers = {
    SEND: handleSend,
    CREATE: handleCreate,
    JOIN: handleJoin,
    CLOSE: handleClose,
    UPDATE: handleUpdate,
    UPDATE_PASSWORD: handleUpdatePassword,
    UPDATE_TOPIC: handleUpdateTopic,
    WHOIS: handleWhois,
    CHAT: handleChat,
    LOGOUT: handleLogout
};

module.exports = function*(userId, sessionId, command) {
    var windowId = command.windowId;
    var network = command.network;

    var conversation = null;

    if (!isNaN(windowId)) {
        var conversationId = yield window.getConversationId(userId, windowId);
        conversation = yield conversationFactory.get(conversationId);
        network = conversation.network;
    }

    var backend = network === 'MAS' ? 'loopbackparser' : 'ircparser';

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
    }
};

function *handleSend(params) {
    if (!params.conversation) {
        return;
    }

    yield params.conversation.addMessage({
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
    var conversation = yield conversationFactory.findGroup(
        params.command.name, params.command.network);

    if (conversation) {
        var isMember = yield conversation.isMember(params.userId);

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
        password: params.command.password
    });
}

function *handleClose(params) {
    var ids = yield window.getWindowIdsForNetwork(params.userId, params.network);

    // Ask all sessions to close this window
    yield outbox.queueAll(params.userId, {
        id: 'CLOSE',
        windowId: params.windowId
    });

    // Backend specific cleanup
    courier.send(params.backend, {
        type: 'close',
        userId: params.userId,
        conversationId: params.conversation.conversationId,
        last: ids.length === 1
    });

    if (params.conversation.type === 'group') {
        yield params.conversation.removeGroupMember(params.userId);
    } else {
        yield params.conversation.remove1on1Member(params.userId);
    }
    yield window.remove(params.userId, params.windowId);
}

function *handleUpdate(params) {
    var accepted = [ 'visible', 'row', 'sounds', 'titleAlert' ];

    for (var i = 0; i < accepted.length; i++) {
        var prop = params.command[accepted[i]];

        if (typeof(prop) !== 'undefined') {
            yield redis.hset('window:' + params.userId + ':' + params.windowId, accepted[i], prop);
        }
    }

    // Notify all sessions. Undefined body properties won't appear in the JSON message
    yield outbox.queueAll(params.userId, {
        id: 'UPDATE',
        windowId: params.windowId,
        visible: params.command.visible,
        row: params.command.row,
        sounds: params.command.sounds,
        titleAlert: params.command.titleAlert
    });
}

function *handleUpdatePassword(params) {
    if (!params.conversation) {
        return;
    }

    var password = params.command.password;

    // TBD: loopback backend: Validate the new password. No spaces, limit length etc.
    if (typeof password !== 'string') {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'UPDATE_PASSWORD_RESP',
            status: 'ERROR',
            errorMsg: 'New password is invalid.'
        });
        return;
    } else if (params.conversation.type === '1on1') {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'UPDATE_PASSWORD_RESP',
            status: 'ERROR',
            errorMsg: 'Can\'t set password for 1on1.'
        });
        return;
    }

    yield params.conversation.setPassword(password);

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
    var userId = params.userId;
    var targetUserId = params.command.userId;
    var network = params.network;

    if (userId === targetUserId) {
        yield outbox.queue(userId, params.sessionId, {
            id: 'CHAT_RESP',
            status: 'ERROR',
            errorMsg: 'You can\'t chat with yourself.'
        });
        return;
    }

    // TDB: Refactor to a method
    if (targetUserId.charAt(0) === 'm') {
        // 1on1s between MAS users are forced through MAS
        network = 'MAS';
        params.backend = 'loopbackparser';
    }

    var conversation = yield conversationFactory.find1on1(userId, targetUserId, network);

    if (conversation) {
        assert(conversation.members[userId]);

        if (conversation.members[userId] !== 'd') {
            yield outbox.queue(userId, params.sessionId, {
                id: 'CHAT_RESP',
                status: 'ERROR',
                errorMsg: 'You are already chatting with this person.'
            });
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
        network: params.network,
        targetUserId: targetUserId
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
            var last = yield redis.run('deleteSession', params.userId, params.sessionId);

            if (last) {
                yield friends.informStateChange(params.userId, 'logout');
            }
        })();
    }, 5000);
}
