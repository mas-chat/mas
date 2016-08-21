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

const redisModule = require('../lib/redis');
const socketIo = require('socket.io');
const uuid = require('uid2');
const requestController = require('./request');
const log = require('../lib/log');
const friendsService = require('../services/friends');
const sessionService = require('../services/session');
const User = require('../models/user');
const UserGId = require('../models/userGId');
const conf = require('../lib/conf');
const userIntroducer = require('../lib/userIntroducer');

const ioServers = [];
const clientSocketList = [];

exports.setup = function setup(server) {
    const io = socketIo(server);
    ioServers.push(io);

    io.on('connection', socket => {
        const session = {
            id: null,
            user: null,
            state: 'connected' // connected, authenticated, terminating, disconnected
        };

        let redisSubscribe = null;

        clientSocketList.push(socket);

        socket.on('init', async function init(data) {
            if (session.id) {
                socket.emit('terminate', {
                    code: 'MULTIPLE_INITS',
                    reason: 'INIT event can be send only once per socket.io connection.'
                });
                await end('Multiple inits.');
                return;
            }

            const secret = data.secret;
            const userGId = UserGId.create(data.userId);

            if (!userGId || !secret) {
                log.info('Invalid init socket.io message.');
                socket.emit('terminate', {
                    code: 'INVALID_INIT',
                    reason: 'Invalid init event.'
                });
                await end('Invalid init.');
                return;
            }

            const user = await User.fetch(userGId.id);
            const ts = Math.round(Date.now() / 1000);

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

            session.user = user;
            session.state = 'authenticated';
            session.id = uuid(15);

            const maxBacklogMsgs = checkBacklogParameterBounds(data.maxBacklogMsgs);
            const cachedUpto = isInteger(data.cachedUpto) ? data.cachedUpto : 0;

            socket.emit('initok', {
                sessionId: session.id,
                maxBacklogMsgs
            });

            log.info(user, `New session init: ${session.id}, client: ${data.clientName}`);
            log.info(user, `maxBacklogMsgs: ${maxBacklogMsgs}, cachedUpto: ${cachedUpto}`);

            redisSubscribe = redisModule.createClient();
            await redisSubscribe.subscribe(user.id, `${user.id}:${session.id}`);

            let processing = false;
            const queue = [];

            async function process(channel, message) {
                if (processing) {
                    queue.push(message);
                    return;
                }

                processing = true;

                const ntf = JSON.parse(message);

                await userIntroducer.scanAndIntroduce(user, ntf, session, socket);

                socket.emit('ntf', ntf);

                // TODO: if (ntf.id !== 'MSG') {
                log.info(user, `Emitted ${ntf.id} (sessionId: ${session.id}) ${message}`);
                // }

                processing = false;

                if (queue.length > 0) {
                    process(null, queue.shift());
                }
            }

            redisSubscribe.on('message', (channel, message) => {
                if (session.state === 'authenticated') {
                    process(channel, message);
                }
            });

            await userIntroducer.introduce(user, userGId, session);
            await sessionService.init(user, session, maxBacklogMsgs, cachedUpto);
        });

        socket.on('req', async function req(data, cb) {
            if (session.state !== 'authenticated') {
                await end('Request arrived before init.');
                return;
            }

            const resp = await requestController.process(session, data);

            await userIntroducer.scanAndIntroduce(session.user, resp, session);

            if (cb) {
                cb(resp); // Send the response as Socket.io acknowledgment.
            }

            if (session.state !== 'authenticated') {
                await end('Request processing requested termination.');
            }
        });

        socket.on('disconnect', async function disconnect() {
            await end('Socket.io disconnect.');
        });

        async function end(reason) {
            if (session.state !== 'disconnected') {
                session.state = 'disconnected';

                clientSocketList.splice(clientSocketList.indexOf(socket), 1);

                socket.disconnect(true);

                if (redisSubscribe) {
                    await redisSubscribe.unsubscribe();
                    const sessions = await redisSubscribe.pubsub('NUMSUB', session.user.id);
                    await redisSubscribe.quit();

                    if (sessions[1] === 0) {
                        await friendsService.informStateChange(session.user, 'logout');
                    }
                }

                const sessionIdExplained = session.id || '<not assigned>';
                log.info(`Session ${sessionIdExplained} ended. Reason: ${reason}`);
            }
        }
    });
};

exports.shutdown = function shutdown() {
    for (const server of ioServers) {
        server.close();
    }

    terminateClientConnections();
};

function checkBacklogParameterBounds(value) {
    const minAllowedBacklog = conf.get('session:min_backlog');
    const maxAllowedBacklog = conf.get('session:max_backlog');

    if (!isInteger(value)) {
        return maxAllowedBacklog;
    } else if (value < minAllowedBacklog) {
        return minAllowedBacklog;
    } else if (value > maxAllowedBacklog) {
        return maxAllowedBacklog;
    }

    return value;
}

function terminateClientConnections() {
    log.info(`Closing all ${clientSocketList.length} socket.io connections`);

    for (const socket of clientSocketList) {
        socket.disconnect(true);
    }
}

function isInteger(x) {
    return (typeof x === 'number') && (x % 1 === 0);
}
