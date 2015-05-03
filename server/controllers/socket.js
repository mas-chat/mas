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
      conf = require('../lib/conf'),
      notification = require('../lib/notification'),
      courier = require('../lib/courier').createEndPoint('socket');

let networks = null;

exports.setup = function(server) {
    let io = socketIo(server);

    io.on('connection', function(socket) {
        let userId = null;
        let sessionId = null;
        let state = 'connected'; // connected, disconnected, authenticated

        function *eventLoop() {
            while (1) {
                let ts = Math.round(Date.now() / 1000);
                yield redis.zadd('sessionlastheartbeat', ts, userId + ':' + sessionId);

                let ntfs = yield notification.receive(userId, sessionId, 60);

                if (state !== 'authenticated') {
                    if (ntfs.length > 0) {
                        yield notification.requeue(userId, sessionId, ntfs);
                    }
                    break;
                }

                for (let ntf of ntfs) {
                    if (ntf.id !== 'MSG') {
                        let ntfAsString = JSON.stringify(ntf);
                        log.info(userId,
                            `Emitted ${ntf.id}. SessionId: ${sessionId}, data: ${ntfAsString}`);
                    }

                    socket.emit('ntf', ntf);
                }
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
                        reason: 'Invalid init event.'
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

                let maxBacklogMsgs = checkBacklogParameterBounds(data.maxBacklogMsgs);
                let cachedUpto = isInteger(data.cachedUpto) ? data.cachedUpto : 0;

                socket.emit('initok', {
                    sessionId: sessionId,
                    maxBacklogMsgs: maxBacklogMsgs
                });

                log.info(userId, 'Initializing new session: ' + sessionId);
                log.info(userId, `maxBacklogMsgs: ${maxBacklogMsgs}, cachedUpto: ${cachedUpto}`);

                yield redis.run('initSession', userId, sessionId, maxBacklogMsgs, cachedUpto);

                yield friends.sendFriends(userId, sessionId);
                yield friends.sendFriendConfirm(userId, sessionId);
                yield friends.informStateChange(userId, 'login');
                yield alerts.sendAlerts(userId, sessionId);
                yield sendNetworkList(userId, sessionId);

                // Check if the user was away too long
                courier.callNoWait('ircparser', 'reconnectifinactive', { userId: userId });

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

        socket.on('req', function(data, cb) {
            co(function*() {
                if (state !== 'authenticated') {
                    end();
                    return;
                }

                let resp = yield requestController(userId, sessionId, data);

                if (cb) {
                    cb(resp); // Send the response as Socket.io acknowledgment.
                }
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

    yield notification.send(userId, sessionId, {
        id: 'NETWORKS',
        networks: networks
    });
}

function checkBacklogParameterBounds(value) {
    let minAllowedBacklog = conf.get('session:min_backlog');
    let maxAllowedBacklog = conf.get('session:max_backlog');

    if (!isInteger(value)) {
        value = maxAllowedBacklog;
    } else if (value < minAllowedBacklog) {
        value = minAllowedBacklog;
    } else if (value > maxAllowedBacklog) {
        value = maxAllowedBacklog;
    }

    return value;
}

function isInteger(x) {
    return (typeof x === 'number') && (x % 1 === 0);
}
