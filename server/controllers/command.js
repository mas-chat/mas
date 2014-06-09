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
            backend = body.network === 'MAS' ? 'loopbackparser' : 'ircparser';
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
            });

            // Redis cleanup
            yield redis.srem('windowlist:' + userId,
                windowId + ':' + network + ':' + name + ':' + type);
            yield redis.del('window:' + userId + ':' + windowId);
            yield redis.del('windowmsgs:' + userId + ':' + windowId);
            yield redis.del('names:' + userId + ':' + windowId);
            break;

        case 'UPDATE':
            var accepted = ['visible', 'row'];

            for (var i = 0; i < accepted.length; i++) {
                var prop = body[accepted[i]];

                if (typeof(prop) !== 'undefined') {
                    yield redis.hset('window:' + userId + ':' + windowId, accepted[i], prop);
                }
            }

            // Notify all sessions
            yield outbox.queueAll(userId, {
                id: 'UPDATE',
                windowId: windowId,
                visible: body.visible,
                row: body.row
            });
            break;
    }

    // TBD: Add lookup table for commands

    var resp = {
        status: 'OK'
    };

    this.body = resp;

};