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

const assert = require('assert');
const Redis = require('ioredis');
const log = require('./log');
const conf = require('./conf');

const activeClients = [];
let shutdownDone = false;

module.exports = createRedisClient();

function createRedisClient({ autoClose = true } = {}) {
    const connType = conf.get('redis:connection_type');
    const client = new Redis({
        port: conf.get('redis:port'),
        host: conf.get('redis:host'),
        password: conf.get('redis:password') || null,
        path: connType === 'socket' ? null : conf.get('redis:unix_socket_path'),
        retryStrategy: retryStrategy
    });

    client.on('error', errorHandler);

    client.__quit = client.quit;

    client.quit = function quit() {
        const index = activeClients.indexOf(client);

        if (index > -1) {
            activeClients.splice(index, 1);
        }

        return client.__quit();
    };

    client.shutdown = function shutdown() {
        assert(!shutdownDone, 'Call shutdown() only once');

        shutdownDone = true;
        log.info(`Closing ${activeClients.length} redis connections`);

        activeClients.forEach(activeClient => activeClient.quit());
    };

    if (autoClose) {
        activeClients.push(client);
    }

    // Extra "exported" functions
    client.createClient = createRedisClient;
    client.retryStrategy = retryStrategy;
    client.errorHandler = errorHandler;

    return client;
}

function retryStrategy(times) {
    const delay = Math.min(times * 1000 + 1000, 5000);

    log.info(`Trying to connect to Redis in ${delay}ms...`);

    return delay;
}

function errorHandler(error) {
    log.warn(`Connection to Redis failed, reason: ${error}`);
}
