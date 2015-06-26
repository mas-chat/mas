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
      settings = require('../models/settings'),
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
        let state = 'connected'; // connected, authenticated, disconnected

        socket.on('init', function(data) {
            co(function*() {
                if (sessionId) {
                    socket.emit('terminate', {
                        code: 'MULTIPLE_INITS',
                        reason: 'INIT event can be send only once per socket.io connection.'
                    });
                    yield end('Multiple inits.');
                    return;
                }

                let ts = Math.round(Date.now() / 1000);
                let secret = data.secret;

                userId = data.userId;

                if (!userId || !secret) {
                    log.info('Invalid init socket.io message.');
                    socket.emit('terminate', {
                        code: 'INVALID_INIT',
                        reason: 'Invalid init event.'
                    });
                    yield end('Invalid init.');
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
                    yield end('Invalid secret.');
                    return;
                }

                state = 'authenticated';
                sessionId = uuid(15);

                let maxBacklogMsgs = checkBacklogParameterBounds(data.maxBacklogMsgs);
                let cachedUpto = isInteger(data.cachedUpto) ? data.cachedUpto : 0;

                socket.emit('initok', {
                    sessionId: sessionId,
                    maxBacklogMsgs: maxBacklogMsgs
                });

                log.info(userId, `New session init: ${sessionId}, client: ${data.clientName}`);
                log.info(userId, `maxBacklogMsgs: ${maxBacklogMsgs}, cachedUpto: ${cachedUpto}`);

                yield redis.run('initSession', userId, sessionId, maxBacklogMsgs, cachedUpto, ts);

                yield settings.sendSet(userId, sessionId);
                yield friends.sendFriends(userId, sessionId);
                yield friends.sendFriendConfirm(userId, sessionId);
                yield friends.informStateChange(userId, 'login');
                yield alerts.sendAlerts(userId, sessionId);
                yield sendNetworkList(userId, sessionId);

                // Check if the user was away too long
                courier.callNoWait('ircparser', 'reconnectifinactive', { userId: userId });

                // Event loop
                while (1) {
                    let loopTs = Math.round(Date.now() / 1000);
                    yield redis.zadd('sessionlastheartbeat', loopTs, userId + ':' + sessionId);

                    let ntfs = yield notification.receive(userId, sessionId, 60);

                    if (state !== 'authenticated') {
                        break;
                    }

                    for (let ntf of ntfs) {
                        if (ntf.id !== 'MSG') {
                            log.info(userId,
                                `Emitted ${ntf.id}. SesId: ${sessionId}, [${JSON.stringify(ntf)}]`);
                        }

                        socket.emit('ntf', ntf);
                    }
                }
            })();
        });

        socket.on('req', function(data, cb) {
            co(function*() {
                if (state !== 'authenticated') {
                    yield end('Request arrived before init.');
                    return;
                }

                let resp = yield requestController(userId, sessionId, data);

                if (cb) {
                    cb(resp); // Send the response as Socket.io acknowledgment.
                }
            })();
        });

        socket.on('disconnect', function() {
            co(function*() {
                yield end('Socket.io disconnect.');
            })();
        });

        function *end(reason) {
            if (state !== 'disconnected') {
                socket.disconnect();
                state = 'disconnected';

                let sessionIdExplained = `${sessionId} ` || '';
                log.info(userId, `Session ${sessionIdExplained}ended. Reason: ${reason}`);

                if (sessionId) {
                    let last = yield redis.run('deleteSession', userId, sessionId);

                    if (last) {
                        yield friends.informStateChange(userId, 'logout');
                    }
                }
            }
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
