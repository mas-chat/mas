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

const path = require('path');
const Redis = require('ioredis');
const Promise = require('bluebird');
const redisLuaHelper = require('redis-lua-helper');
const log = require('./log');
const conf = require('./conf');

const rlh = redisLuaHelper({
    root: path.join(__dirname, '..', 'lua'),
    macro: '#include',
    extension: 'lua'
});

const activeClients = [];

exports.createClient = function createClient(options) {
    return createRedisClient(options);
};

exports.loadScripts = async function loadScripts() {
    const redisClient = createRedisClient();
    const scripts = await Promise.promisify(rlh.loadDir, { context: rlh })();

    for (const scriptName of scripts) {
        try {
            await redisClient.script('load', rlh.code(scriptName));
        } catch (e) {
            log.error(`Lua script loading failed: ${scriptName}, ${e}`);
        }
    }

    log.info(`Loaded ${scripts.length} Redis Lua scripts.`);

    redisClient.quit();
};

exports.shutdown = function shutdown() {
    log.info(`Closing ${activeClients.length} redis connections`);

    activeClients.forEach(client => client.quit());
};

function createRedisClient({ autoClose = true } = {}) {
    const connType = conf.get('redis:connection_type');
    const client = new Redis({
        port: conf.get('redis:port'),
        host: conf.get('redis:host'),
        password: conf.get('redis:password') || null,
        path: connType === 'socket' ? null : conf.get('redis:unix_socket_path'),
        retryStrategy: times => Math.min(times * 500, 2000)
    });

    client.__quit = client.quit;

    client.run = function run(scriptName, ...params) {
        try {
            return client.evalsha(rlh.shasum(scriptName), 0, ...params);
        } catch (e) {
            log.warn(`Lua script failed: ${scriptName}, ${e}`);
        }

        return null;
    };

    client.quit = function quit() {
        const index = activeClients.indexOf(client);

        if (index > -1) {
            activeClients.splice(index, 1);
        }

        return client.__quit();
    };

    if (autoClose) {
        activeClients.push(client);
    }

    return client;
}
