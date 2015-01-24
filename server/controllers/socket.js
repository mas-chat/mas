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
    var io = socketIo(server);

    // Socket.io
    io.on('connection', function(socket) {
        var authenticated = false;
        var connected = true;
        var userId = null;
        var sessionId = null;

        socket.on('init', function(data) {
            co(function*() {
                var ts = Math.round(Date.now() / 1000);
                var secret = data.secret;

                userId = data.userId;

                if (!userId || !secret) {
                    log.info('Invalid init socket.io message.');
                    socket.emit('initfail', {
                        reason: 'Invalid init message.'
                    });
                    socket.disconnect();
                    return;
                }

                var userRecord = yield redis.hgetall('user:' + userId);

                if (!(userRecord &&
                    userRecord.secretExpires > ts &&
                    userRecord.secret === secret &&
                    userRecord.inuse)) {
                    log.info(userId, 'Init message with incorrect or expired secret.');
                    socket.emit('initfail', {
                        reason: 'Invalid or expired secret.'
                    });
                    socket.disconnect();
                    return;
                }

                authenticated = true;
                sessionId = uuid(15);

                socket.emit('initok', { sessionId: sessionId });

                yield redis.zadd('sessionlist:' + userId, ts, sessionId);
                yield redis.zadd('sessionlastheartbeat', ts, userId + ':' + sessionId);

                log.info(userId, 'Initializing new session: ' + sessionId);
                yield redis.run('initSession', userId, sessionId);
                yield nicks.sendNick(userId, sessionId);

                yield friends.sendFriends(userId, sessionId);
                yield friends.informStateChange(userId, 'login');

                function emit(command) {
                    var id = command.id;

                    // TBD: Temporary hack
                    if (id.indexOf('_RESP', id.length - 5) !== -1) {
                        socket.emit('resp', command);
                    } else {
                        socket.emit('ntf', command);
                    }
                }

                co(function*() {
                    while (1) {
                        var commands = yield outbox.flush(userId, sessionId, 25);
                        commands.forEach(emit);

                        if (!connected) {
                            break; // Prevents memory leaks
                        }
                    }
                })();
            })();
        });

        socket.on('req', function(data) {
            co(function*() {
                if (!authenticated) {
                    socket.disconnect();
                    return;
                }

                yield requestController(userId, sessionId, data);
            })();
        });

        socket.on('disconnect', function() {
            connected = false;
            // Session is torn down in deleteIdleSessions() handler
        });

        socket.conn.on('heartbeat', function() {
            co(function*() {
                if (!authenticated) {
                    socket.disconnect();
                    return;
                }

                var ts = Math.round(Date.now() / 1000);
                yield redis.zadd('sessionlastheartbeat', ts, userId + ':' + sessionId);
            })();
        });
    });
};
