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

var path = require('path'),
    assert = require('assert'),
    coRedis = require('co-redis'),
    redis = require('redis'),
    thunkify = require('thunkify'),
    redisLuaHelper = require('redis-lua-helper'),
    log = require('./log'),
    conf = require('./conf');

var rlh = redisLuaHelper({
    root: path.join(__dirname, '..', 'lua'),
    macro: '#include',
    extension: 'lua'
});

module.exports = {
    createClient: createClient,
    loadScripts: loadScripts
};

function createClient() {
    var plainRedisClient;

    if (conf.get('redis:connection_type') === 'socket') {
        plainRedisClient = redis.createClient(conf.get('redis:port'), conf.get('redis:host'));
    } else {
        plainRedisClient = redis.createClient(conf.get('redis:unix_socket_path'));
    }

    var coRedisClient = coRedis(plainRedisClient);

    coRedisClient.plainRedis = redis;
    coRedisClient.plainRedisClient = plainRedisClient;

    coRedisClient.run = function*() {
        var params = [].slice.call(arguments);
        var scriptName = params.shift();
        var sha = rlh.shasum(scriptName);

        assert(sha);

        var args = [ sha, 0 ].concat(params);
        var res;

        try {
            res = yield coRedisClient.evalsha.apply(this, args);
        } catch (e) {
            log.warn('Lua script failed: ' + scriptName + ', ' + e);
        }

        return res;
    };

    return coRedisClient;
}

function *loadScripts() {
    var redisClient = createClient();
    var loadDir = thunkify(function(callback) {
        rlh.loadDir(callback);
    });
    var scripts = yield loadDir();

    for (var i = 0; i < scripts.length; i++) {
        var scriptName = scripts[i];
        log.info('Loading Redis script: ' + scriptName);
        try {
            yield redisClient.script('load', rlh.code(scriptName));
        } catch (e) {
            log.error('Lua script loading failed: ' + scriptName + ', ' + e);
        }
    }
}
