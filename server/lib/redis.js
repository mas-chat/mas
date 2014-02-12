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

var fs = require('fs'),
    assert = require('assert'),
    coRedis = require('co-redis'),
    redis = require('redis'),
    log = require('./log');

var luaPath = __dirname + '/../lua';
var luaFuncs = {};

module.exports = {
    createClient: createClient,
    loadScripts: loadScripts
};

function createClient() {
    var plainRedisClient = redis.createClient();
    var coRedisClient = coRedis(plainRedisClient);

    coRedisClient.plainRedis = redis;
    coRedisClient.plainRedisClient = plainRedisClient;
    coRedisClient.run = function *() {
        var params = [].slice.call(arguments);
        var sha = luaFuncs[params.shift()];
        assert(sha);

        var args = [ sha, 0 ].concat(params);
        return yield coRedisClient.evalsha.apply(this, args);
    };

    return coRedisClient;
}

function *loadScripts() {
    var luaScripts = fs.readdirSync(luaPath);
    var redisClient = createClient();

    for (var i = 0; i < luaScripts.length; i++) {
        var fileName = luaScripts[i];
        log.info('Loading Redis script: ' + fileName);

        var script = fs.readFileSync(luaPath + '/' + fileName);
        var sha = yield redisClient.script('load', script);
        var scriptName = fileName.replace(/\..+$/, ''); // Remove file extension
        luaFuncs[scriptName] = sha;
    }
}
