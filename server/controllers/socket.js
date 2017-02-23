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

const redis = require('../lib/redis');
const socketIo = require('socket.io');
const uuid = require('uid2');
const requestController = require('./request');
const log = require('../lib/log');
const UserGId = require('../lib/userGId');
const conf = require('../lib/conf');
const userIntroducer = require('../lib/userIntroducer');
const authSessionService = require('../services/authSession');
const friendsService = require('../services/friends');
const sessionService = require('../services/session');
const User = require('../models/user');

const ioServers = [];
const clientSocketList = [];

exports.setup = function setup(server) {
    const io = socketIo(server, { pingInterval: 10000, pingTimeout: 15000 });
    ioServers.push(io);

    io.on('connection', socket => {
        const session = {
            id: uuid(15),
            user: null,
            state: 'connected' // connected, authenticated, terminating, disconnected
        };

        log.info(`Socket.io session created, id: ${session.id}`);

        let redisSubscribe = null;

        clientSocketList.push(socket);

        socket.on('init', async data => {
            log.info(`socket.io init message received, session: ${session.id}`);

            if (session.state === 'authenticated') {
                socket.emit('terminate', {
                    code: 'MULTIPLE_INITS',
                    reason: 'INIT event can be send only once per socket.io connection.'
                });
                await end('Multiple inits.');
                return;
            }

            if (!data.cookie) {
                log.info('Invalid init socket.io message, cookie missing');
                socket.emit('terminate', {
                    code: 'INVALID_INIT',
                    reason: 'Invalid init event. Token missing.'
                });
                await end('Invalid init, cookie missing.');
                return;
            }

            const userId = await authSessionService.validateCookie(data.cookie, { delete: true });
            const user = userId ? await User.fetch(userId) : null;

            if (!user || !user.get('inUse')) {
                socket.emit('terminate', {
                    code: 'INVALID_TOKEN',
                    reason: 'Invalid or expired session.'
                });
                await end('Invalid cookie.');

                if (user) {
                    log.info(user, 'Init message with incorrect or expired cookie.');
                }

                return;
            }

            const maxBacklogMsgs = checkBacklogParameterBounds(data.maxBacklogMsgs);
            const cachedUpto = isInteger(data.cachedUpto) ? data.cachedUpto : 0;
            const remoteIp = socket.conn.remoteAddress;

            session.user = user;
            session.state = 'authenticated';
            session.authSession = await authSessionService.create(user.id, remoteIp);

            socket.emit('initok', {
                sessionId: session.id,
                userId,
                refreshCookie: authSessionService.encodeToCookie(session.authSession),
                maxBacklogMsgs
            });

            log.info(user, `New session init: ${session.id}, client: ${data.clientName}`);
            log.info(user, `maxBacklogMsgs: ${maxBacklogMsgs}, cachedUpto: ${cachedUpto}`);

            redisSubscribe = redis.createClient();
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

                if (ntf.id !== 'MSG') {
                    log.info(user, `Emitted ${ntf.id} (sessionId: ${session.id}) ${message}`);
                }

                processing = false;

                if (queue.length > 0) {
                    process(null, queue.shift());
                }
            }

            redisSubscribe.on('message', async (channel, message) => {
                const { type, msg } = JSON.parse(message);

                if (type === 'terminate') {
                    socket.emit('terminate', {
                        code: 'LOGOUT_ALL',
                        reason: 'User initiated global logout.'
                    });
                    await end('Multiple inits.');
                } else if (session.state === 'authenticated') {
                    process(channel, msg);
                }
            });

            await userIntroducer.introduce(user, UserGId.create({ type: 'mas', id: userId }), session);
            await sessionService.init(user, session, maxBacklogMsgs, cachedUpto);
        });

        socket.on('req', async (data, cb) => {
            if (session.state !== 'authenticated') {
                await end('Request arrived before init.');
                return;
            }

            let resp;

            try {
                resp = await requestController.process(session, data);
            } catch (e) {
                resp = { status: 'INTERNAL_ERROR', errorMsg: 'Internal error.' };
                log.warn(session.user, `Exception: ${e}, stack: ${e.stack.replace(/\n/g, ',')}`);
            }

            await userIntroducer.scanAndIntroduce(session.user, resp, session);

            if (cb) {
                cb(resp); // Send the response as Socket.io acknowledgment.
            }

            if (session.state !== 'authenticated') {
                await end('Request processing requested termination.');
            }
        });

        socket.on('disconnect', async () => {
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
