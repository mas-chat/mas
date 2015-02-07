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

let path = require('path'),
    assert = require('assert'),
    coRedis = require('co-redis'),
    redis = require('redis'),
    thunkify = require('thunkify'),
    redisLuaHelper = require('redis-lua-helper'),
    log = require('./log'),
    conf = require('./conf');

let rlh = redisLuaHelper({
    root: path.join(__dirname, '..', 'lua'),
    macro: '#include',
    extension: 'lua'
});

exports.createClient = function() {
    return createClient();
};

exports.loadScripts = function*() {
    let redisClient = createClient();
    let loadDir = thunkify(function(callback) {
        rlh.loadDir(callback);
    });
    let scripts = yield loadDir();

    for (let scriptName of scripts) {
        log.info('Loading Redis script: ' + scriptName);
        try {
            yield redisClient.script('load', rlh.code(scriptName));
        } catch (e) {
            log.error('Lua script loading failed: ' + scriptName + ', ' + e);
        }
    }
};

exports.initDB = function*() {
    let redisClient = createClient();

    let networks = [ 'MAS' ].concat(Object.keys(conf.get('irc:networks')));
    yield redisClient.del('networklist');
    yield redisClient.sadd('networklist', networks);
    yield redisClient.quit();
};

function createClient() {
    let plainRedisClient;

    if (conf.get('redis:connection_type') === 'socket') {
        plainRedisClient = redis.createClient(conf.get('redis:port'), conf.get('redis:host'));
    } else {
        plainRedisClient = redis.createClient(conf.get('redis:unix_socket_path'));
    }

    let coRedisClient = coRedis(plainRedisClient);

    coRedisClient.plainRedis = redis;
    coRedisClient.plainRedisClient = plainRedisClient;

    coRedisClient.run = function*() {
        let params = [].slice.call(arguments);
        let scriptName = params.shift();
        let sha = rlh.shasum(scriptName);

        assert(sha);

        let args = [ sha, 0 ].concat(params);
        let res;

        try {
            res = yield coRedisClient.evalsha.apply(this, args);
        } catch (e) {
            log.warn('Lua script failed: ' + scriptName + ', ' + e);
        }

        return res;
    };

    return coRedisClient;
}
