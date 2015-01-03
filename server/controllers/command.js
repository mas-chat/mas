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

var co = require('co'),
    log = require('../lib/log'),
    redis = require('../lib/redis').createClient(),
    outbox = require('../lib/outbox'),
    courier = require('../lib/courier').createEndPoint('command'),
    conversation = require('../lib/conversation'),
    window = require('../lib/window'),
    friends = require('../lib/friends');

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

module.exports = function*() {
    var userId = this.mas.userId;
    var sessionId = this.mas.sessionId;

    var command = this.request.body.command;
    var windowId = command.windowId;
    var network = command.network;

    var conversationId = null;
    var conversationRecord = null;

    if (!isNaN(windowId)) {
        conversationId = yield window.getConversationId(userId, windowId);
        conversationRecord = yield conversation.get(conversationId);
        network = conversationRecord.network;
    }

    var backend = network === 'MAS' ? 'loopbackparser' : 'ircparser';

    log.info(userId, 'Prosessing command: ' + command.id);

    // TBD: Check that windowId, network, and name are valid

    if (handlers[command.id]) {
        yield handlers[command.id]({
            userId: userId,
            sessionId: sessionId,
            windowId: windowId,
            conversationId: conversationId,
            backend: backend,
            network: network,
            command: command
        });
    }

    yield redis.hincrby('session:' + this.mas.userId + ':' + sessionId, 'sendRcvNext', 1);

    this.set('Cache-Control', 'private, max-age=0, no-cache');
    this.status = 204;
};

function *handleSend(params) {
    yield conversation.addMessage(params.conversationId, params.sessionId, {
        userId: params.userId,
        cat: 'msg',
        body: params.command.text
    });

    yield courier.send(params.backend, {
        type: 'send',
        userId: params.userId,
        sessionId: params.sessionId,
        conversationId: params.conversationId,
        text: params.command.text
    });
}

function *handleCreate(params) {
    yield courier.send('loopbackparser', {
        type: 'create',
        userId: params.userId,
        sessionId: params.sessionId,
        name: params.command.name,
        password: params.command.password
    });
}

function *handleJoin(params) {
    yield courier.send(params.backend, {
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
    yield courier.send(params.backend, {
        type: 'close',
        userId: params.userId,
        conversationId: params.conversationId,
        last: ids.length === 1
    });

    yield conversation.removeGroupMember(params.conversationId, params.userId);
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
    yield courier.send(params.backend, {
        type: 'updatePassword',
        userId: params.userId,
        name: params.name,
        network: params.network,
        password: params.command.password
    });

    // TBD: loopback backend: Validate the new password. No spaces, limit length etc.

    // TBD: loopback backend needs to update the password manually in redis and notify
    // all session using UPDATE command, IRC backend does all this in handleMode() when
    // the IRC server echoes the MODE command
}

function *handleUpdateTopic(params) {
    yield courier.send(params.backend, {
        type: 'updateTopic',
        userId: params.userId,
        name: params.name,
        network: params.network,
        topic: params.command.topic
    });
}

function *handleWhois(params) {
    yield courier.send(params.backend, {
        type: 'whois',
        userId: params.userId,
        network: params.network,
        nick: params.command.nick
    });
}

function *handleChat(params) {
    var targetUserId = params.command.userId;
    var windowId = yield window.get1on1WindowId(
        params.userId, params.network, targetUserId, '1on1');

    if (windowId !== null) {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'CHAT_RESP',
            status: 'ERROR',
            errorMsg: 'You are already chatting with this person.'
        });
    } else {
        yield courier.send(params.backend, {
            type: 'chat',
            userId: params.userId,
            network: params.network,
            targetUserId: targetUserId
        });
    }
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
