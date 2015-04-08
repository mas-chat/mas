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

const redis = require('../lib/redis').createClient(),
      socketIo = require('socket.io'),
      co = require('co'),
      uuid = require('uid2'),
      requestController = require('../controllers/request'),
      log = require('../lib/log'),
      friends = require('../models/friends'),
      alerts = require('../lib/alert'),
      outbox = require('../lib/outbox'),
      courier = require('../lib/courier').createEndPoint('socket');

let networks = null;

exports.setup = function(server) {
    let io = socketIo(server);

    io.on('connection', function(socket) {
        let userId = null;
        let sessionId = null;
        let state = 'connected'; // connected, disconnected, authenticated

        function emit(command) {
            socket.emit(command.id.endsWith('_RESP') ? 'resp' : 'ntf', command);
        }

        function *eventLoop() {
            while (1) {
                let ts = Math.round(Date.now() / 1000);
                yield redis.zadd('sessionlastheartbeat', ts, userId + ':' + sessionId);

                let commands = yield outbox.waitMsg(userId, sessionId, 60);

                if (state !== 'authenticated') {
                    break;
                }

                commands.forEach(emit);
            }
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
                    end();
                    return;
                }

                let userRecord = yield redis.hgetall(`user:${userId}`);

                if (!(userRecord &&
                    userRecord.secretExpires > ts &&
                    userRecord.secret === secret &&
                    userRecord.inuse === 'true')) {
                    log.info(userId, 'Init message with incorrect or expired secret.');
                    socket.emit('terminate', {
                        code: 'INVALID_SECRET',
                        reason: 'Invalid or expired secret.'
                    });
                    end();
                    return;
                }

                state = 'authenticated';
                sessionId = uuid(15);

                yield redis.zadd(`sessionlist:${userId}`, ts, sessionId);
                socket.emit('initok', { sessionId: sessionId });

                log.info(userId, 'Initializing new session: ' + sessionId);
                yield redis.run('initSession', userId, sessionId);

                yield friends.sendFriends(userId, sessionId);
                yield friends.sendFriendConfirm(userId, sessionId);
                yield friends.informStateChange(userId, 'login');
                yield alerts.sendAlerts(userId, sessionId);
                yield sendNetworkList(userId, sessionId);
                ircCheckIfInactive(userId);

                yield eventLoop();
                end();
            })();
        });

        socket.on('resume', function(data) {
            co(function*() {
                userId = data.userId;
                sessionId = data.sessionId;

                let exists = yield redis.zscore(`sessionlist:${userId}`, sessionId);

                if (!exists) {
                    socket.emit('terminate', {
                        code: 'INVALID_SESSION',
                        reason: 'Invalid or expired session.'
                    });
                    end();
                    return;
                }

                socket.emit('resumeok');
                state = 'authenticated';

                yield eventLoop();
                end();
            })();
        });

        socket.on('req', function(data) {
            co(function*() {
                if (state !== 'authenticated') {
                    end();
                    return;
                }

                yield requestController(userId, sessionId, data);
            })();
        });

        socket.on('disconnect', function() {
            // Session is torn down in deleteIdleSessions() handler
            end();
        });

        function end() {
            log.info(userId, 'Socket.io disconnect. sessionId: ' + sessionId);
            state = 'disconnected';
            socket.disconnect();
        }
    });
};

function *sendNetworkList(userId, sessionId) {
    networks = networks || (yield redis.smembers('networklist'));

    yield outbox.queue(userId, sessionId, {
        id: 'NETWORKS',
        networks: networks
    });
}

function ircCheckIfInactive(userId) {
    courier.send('ircparser', {
        type: 'reconnectifinactive',
        userId: userId,
    });
}
