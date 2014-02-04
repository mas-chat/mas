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

var log = require('../../lib/log'),
    wrapper = require('co-redis'),
    plainRedis = require('redis'),
    redis = wrapper(plainRedis.createClient()),
    util = require('util');

exports.reset = function *(userId) {
    yield redis.del('outbox:' + userId);
};

exports.queue = function *(userId) {
    var commands = [];

    for (var i = 1; i < arguments.length; i++) {
        var command = arguments[i];

        if (util.isArray(command)) {
            commands = commands.concat(command);
        } else {
            commands.push(command);
        }
    }

    commands = commands.map(function(value) {
        return typeof(value) === 'string' ? value : JSON.stringify(value);
    });

    commands.unshift('outbox:' + userId);
    yield redis.lpush.apply(redis, commands);
};

exports.flush = function *(userId, timeout) {
    var result,
        command,
        commands = [];

    if (timeout) {
        // Wait for first command to appear if timeout is given
        // For every blocking redis call we need to create own redis client. Otherwise
        // HTTP calls block each other.
        var plainClient = plainRedis.createClient();
        result = yield wrapper(plainClient).brpop('outbox:' + userId, timeout);
        plainClient.end();

        if (result) {
            command = result[1];
            commands.push(JSON.parse(command));
        }
    }

    // Retrieve other commands if there are any
    while ((command = yield redis.rpop('outbox:' + userId)) !== null) {
        commands.push(JSON.parse(command));
    }

    log.info(userId, 'Flushed outbox. Response: ' + JSON.stringify(commands).substring(0, 100));

    return commands;
};

exports.length = function *(userId) {
    return parseInt(yield redis.llen('outbox:' + userId));
};
