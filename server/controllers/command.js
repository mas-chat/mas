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

var parse = require('co-body'),
    log = require('../lib/log'),
    redis = require('../lib/redis').createClient(),
    outbox = require('../lib/outbox'),
    courier = require('../lib/courier').createEndPoint('command'),
    textLine = require('../lib/textLine'),
    windowHelper = require('../lib/windows'),
    nicks = require('../lib/nick');

module.exports = function *() {
    var userId = this.mas.userId;
    var sessionId = this.mas.sessionId;
    var body = yield parse.json(this.req);

    var command = body.id;
    var windowId = parseInt(body.windowId);
    var result = yield windowHelper.getWindowNameAndNetwork(userId, windowId);
    var name = result[0];
    var network = result[1];
    var type = result[2];
    var backend = network === 'MAS' ? 'loopbackparser' : 'ircparser';

    log.info(userId, 'Prosessing command: ' + command);

    // TBD Check that windowId, network, and name are valid

    switch (command) {
        case 'SEND':
            var nick = yield nicks.getCurrentNick(userId, network);

            if (network === 'MAS' && type === '1on1') {
                var targetUserId = yield redis.hget('window:' + userId + ':' + windowId,
                    'targetUserId');

                yield courier.send(backend, {
                    type: 'sendPrivate',
                    userId: userId,
                    targetUserId: targetUserId,
                    text: body.text
                });
            } else {
                yield courier.send(backend, {
                    type: 'send',
                    userId: userId,
                    network: network,
                    name: name,
                    text: body.text
                });
            }

            yield textLine.sendByWindowId(userId, windowId, {
                nick: nick,
                cat: 'mymsg',
                body: body.text
            }, sessionId);
            break;

        case 'CREATE':
            yield courier.send('loopbackparser', {
                type: 'create',
                userId: userId,
                sessionId: sessionId,
                name: body.name,
                password: body.password
            });
            break;

        case 'JOIN':
            yield courier.send(backend, {
                type: 'join',
                userId: userId,
                sessionId: sessionId,
                network: body.network,
                name: body.name,
                password: body.password
            });
            break;

        case 'CLOSE':
            var ids = yield windowHelper.getWindowIdsForNetwork(userId, network);

            // Ask all session to close this window
            yield outbox.queueAll(userId, {
                id: 'CLOSE',
                windowId: windowId,
            });

            // Backend specific cleanup
            yield courier.send(backend, {
                type: 'close',
                userId: userId,
                network: network,
                name: name,
                windowType: type,
                last: ids.length === 1
            });

            // Redis cleanup
            yield redis.srem('windowlist:' + userId,
                windowId + ':' + network + ':' + name + ':' + type);
            yield redis.del('window:' + userId + ':' + windowId);
            yield redis.del('windowmsgs:' + userId + ':' + windowId);
            yield redis.del('names:' + userId + ':' + windowId);
            break;

        case 'UPDATE':
            var accepted = ['visible', 'row', 'sounds', 'titleAlert'];

            for (var i = 0; i < accepted.length; i++) {
                var prop = body[accepted[i]];

                if (typeof(prop) !== 'undefined') {
                    yield redis.hset('window:' + userId + ':' + windowId, accepted[i], prop);
                }
            }

            // Notify all sessions. Undefined body properties won't appear in the JSON message
            yield outbox.queueAll(userId, {
                id: 'UPDATE',
                windowId: windowId,
                visible: body.visible,
                row: body.row,
                sounds: body.sounds,
                titleAlert: body.titleAlert
            });
            break;

        case 'UPDATE_PASSWORD':
            yield courier.send(backend, {
                type: 'updatePassword',
                userId: userId,
                name: name,
                network: network,
                password: body.password
            });

            // TBD: loopback backend: Validate the new password. No spaces, limit length etc.

            // TBD: loopback backend needs to update the password manually in redis and notify
            // all session using UPDATE command, IRC backend does all this in handleMode() when
            // the IRC server echoes the MODE command
            break;

        case 'UPDATE_TOPIC':
            yield courier.send(backend, {
                type: 'updateTopic',
                userId: userId,
                name: name,
                network: network,
                topic: body.topic
            });
            break;

        case 'WHOIS':
            yield courier.send(backend, {
                type: 'whois',
                userId: userId,
                network: network,
                nick: body.nick
            });
            break;

        case 'CHAT':
            windowId = yield windowHelper.getWindowId(userId, network, body.nick, '1on1');

            if (windowId !== null) {
                yield outbox.queue(userId, sessionId, {
                    id: 'CHAT_RESP',
                    status: 'ERROR',
                    errorMsg: 'You are already chatting with ' + body.nick
                });
            } else {
                yield courier.send(backend, {
                    type: 'chat',
                    userId: userId,
                    network: network,
                    nick: body.nick
                });
            }
            break;
    }

    // TBD: Add lookup table for commands

    var resp = {
        status: 'OK'
    };

    this.body = resp;

};