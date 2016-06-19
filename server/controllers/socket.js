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
      uuid = require('uid2'),
      requestController = require('./request'),
      log = require('../lib/log'),
      friendsService = require('../services/friends'),
      sessionService = require('../services/session'),
      User = require('../models/user'),
      UserGId = require('../models/userGId'),
      conf = require('../lib/conf'),
      notification = require('../lib/notification');

let ioServers = [];
let clientSocketList = [];

exports.setup = function(server) {
    let io = socketIo(server);
    ioServers.push(io);

    io.on('connection', function(socket) {
        let userGId = null;
        let user = null;
        let sessionId = null;
        let state = 'connected'; // connected, authenticated, disconnected

        clientSocketList.push(socket);

        socket.on('init', async function(data) {
            if (sessionId) {
                socket.emit('terminate', {
                    code: 'MULTIPLE_INITS',
                    reason: 'INIT event can be send only once per socket.io connection.'
                });
                await end('Multiple inits.');
                return;
            }

            let ts = Math.round(Date.now() / 1000);
            let secret = data.secret;

            userGId = UserGId.create(data.userId);

            if (!userGId.valid || !secret) {
                log.info('Invalid init socket.io message.');
                socket.emit('terminate', {
                    code: 'INVALID_INIT',
                    reason: 'Invalid init event.'
                });
                await end('Invalid init.');
                return;
            }

            user = await User.fetch(userGId.id);

            if (!(user && user.get('secretExpires') > ts &&
                user.get('secret') === secret && user.get('inUse'))) {
                log.info(user, 'Init message with incorrect or expired secret.');
                socket.emit('terminate', {
                    code: 'INVALID_SECRET',
                    reason: 'Invalid or expired secret.'
                });
                await end('Invalid secret.');
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

            log.info(user, `New session init: ${sessionId}, client: ${data.clientName}`);
            log.info(user, `maxBacklogMsgs: ${maxBacklogMsgs}, cachedUpto: ${cachedUpto}`);

            await sessionService.init(user, sessionId, maxBacklogMsgs, cachedUpto, ts);

            // Event loop
            for (;;) {
                let loopTs = Math.round(Date.now() / 1000);
                await redis.zadd('sessionlastheartbeat', loopTs, userGId + ':' + sessionId);

                let ntfs = await notification.receive(user, sessionId, 10);

                if (state !== 'authenticated') {
                    break;
                }

                for (let ntf of ntfs) {
                    if (ntf.id !== 'MSG') {
                        log.info(user,
                            `Emitted ${ntf.id}. SesId: ${sessionId}, [${JSON.stringify(ntf)}]`);
                    }

                    socket.emit('ntf', ntf);
                }
            }
        });

        socket.on('req', async function(data, cb) {
            if (state !== 'authenticated') {
                await end('Request arrived before init.');
                return;
            }

            let resp = await requestController.process(user, sessionId, data);

            await notification.communicateNewUserIds(userGId, sessionId, resp);

            if (cb) {
                cb(resp); // Send the response as Socket.io acknowledgment.
            }
        });

        socket.on('disconnect', async function() {
            await end('Socket.io disconnect.');
        });

        async function end(reason) {
            if (state !== 'disconnected') {
                clientSocketList.splice(clientSocketList.indexOf(socket), 1);
                socket.disconnect(true);

                state = 'disconnected';

                let sessionIdExplained = sessionId || '<not assigned>';
                log.info(`Session ${sessionIdExplained} ended. Reason: ${reason}`);

                if (sessionId) {
                    let last = await redis.run('deleteSession', userGId, sessionId);

                    if (last) {
                        await friendsService.informStateChange(user, 'logout');
                    }
                }
            }
        }
    });
};

exports.shutdown = async function() {
    for (let server of ioServers) {
        server.close();
    }

    terminateClientConnections();
};

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

function terminateClientConnections() {
    log.info(`Closing all ${clientSocketList.length} socket.io connections`);

    for (let socket of clientSocketList) {
        socket.disconnect(true);
    }
}

function isInteger(x) {
    return (typeof x === 'number') && (x % 1 === 0);
}
