//
//   Copyright 2015 Ilkka Oksanen <iao@iki.fi>
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

var redis = require('../lib/redis').createClient(),
    socketIo = require('socket.io'),
    co = require('co'),
    uuid = require('uid2'),
    requestController = require('../controllers/request'),
    log = require('../lib/log'),
    nicks = require('../models/nick'),
    friends = require('../models/friends'),
    outbox = require('../lib/outbox');

exports.setup = function(server) {
    let io = socketIo(server);

    // Socket.io
    io.on('connection', function(socket) {
        let userId = null;
        let sessionId = null;
        let state = 'connected';
        // connected, disconnected, authenticated

        function emit(command) {
            let id = command.id;

            // TBD: Temporary hack
            if (id.indexOf('_RESP', id.length - 5) !== -1) {
                socket.emit('resp', command);
            } else {
                socket.emit('ntf', command);
            }
        }

        function startPushLoop() {
            co(function*() {
                while (1) {
                    let commands = yield outbox.flush(userId, sessionId, 25);
                    commands.forEach(emit);

                    if (state !== 'authenticated') {
                        break; // Prevents memory leaks
                    }
                }
            })();
        }

        socket.on('init', function(data) {
            co(function*() {
                let ts = Math.round(Date.now() / 1000);
                let secret = data.secret;

                userId = data.userId;

                if (!userId || !secret) {
                    log.info('Invalid init socket.io message.');
                    socket.emit('terminate', {
                        code: 'INVALID_INIT',
                        reason: 'Invalid init message.'
                    });
                    state = 'disconnected';
                    socket.disconnect();
                    return;
                }

                let userRecord = yield redis.hgetall('user:' + userId);

                if (!(userRecord &&
                    userRecord.secretExpires > ts &&
                    userRecord.secret === secret &&
                    userRecord.inuse)) {
                    log.info(userId, 'Init message with incorrect or expired secret.');
                    socket.emit('terminate', {
                        code: 'INVALID_SECRET',
                        reason: 'Invalid or expired secret.'
                    });
                    state = 'disconnected';
                    socket.disconnect();
                    return;
                }

                state = 'authenticated';
                sessionId = uuid(15);

                socket.emit('initok', { sessionId: sessionId });

                yield redis.zadd('sessionlist:' + userId, ts, sessionId);
                yield redis.zadd('sessionlastheartbeat', ts, userId + ':' + sessionId);

                log.info(userId, 'Initializing new session: ' + sessionId);
                yield redis.run('initSession', userId, sessionId);
                yield nicks.sendNick(userId, sessionId);

                yield friends.sendFriends(userId, sessionId);
                yield friends.informStateChange(userId, 'login');

                startPushLoop();
            })();
        });

        socket.on('resume', function(data) {
            co(function*() {
                userId = data.userId;
                sessionId = data.sessionId;

                let exists = yield redis.zscore('sessionlist:' + userId, sessionId);

                if (!exists) {
                    socket.emit('terminate', {
                        code: 'INVALID_SESSION',
                        reason: 'Invalid or expired session.'
                    });
                    state = 'disconnected';
                    socket.disconnect();
                    return;
                }

                state = 'authenticated';
                startPushLoop();
            })();
        });

        socket.on('req', function(data) {
            co(function*() {
                if (state !== 'authenticated') {
                    state = 'disconnected';
                    socket.disconnect();
                    return;
                }

                yield requestController(userId, sessionId, data);
            })();
        });

        socket.on('disconnect', function() {
            // Session is torn down in deleteIdleSessions() handler
            state = 'disconnected';
        });

        socket.conn.on('heartbeat', function() {
            co(function*() {
                if (state !== 'authenticated') {
                    state = 'disconnected';
                    socket.disconnect();
                    return;
                }

                let ts = Math.round(Date.now() / 1000);
                yield redis.zadd('sessionlastheartbeat', ts, userId + ':' + sessionId);
            })();
        });
    });
};
