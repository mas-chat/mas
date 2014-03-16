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

var util = require('util'),
    log = require('./log'),
    redisModule = require('./redis'),
    redis = redisModule.createClient();

exports.queue = function *(userId, sessionId) {
    var commands = [];

    // If sessionID is boolean 'true' then broadcast to all active session
    if (sessionId === true) {
        sessionId = 0;
    }

    for (var i = 2; i < arguments.length; i++) {
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

    var params = [ 'queueOutbox', userId, sessionId ].concat(commands);
    yield redis.run.apply(this, params);
};

exports.flush = function *(userId, sessionId, timeout) {
    var result,
        command,
        commands = [];

    if (timeout) {
        // Wait for first command to appear if timeout is given
        // For every blocking redis call we need to create own redis client. Otherwise
        // HTTP calls block each other.
        var newClient = redisModule.createClient();
        result = yield newClient.brpop('outbox:' + userId + ':' + sessionId, timeout);
        newClient.end();

        if (result) {
            command = result[1];
            commands.push(JSON.parse(command));
        }
    }

    // Retrieve other commands if there are any
    while ((command = yield redis.rpop('outbox:' + userId + ':' + sessionId)) !== null) {
        commands.push(JSON.parse(command));
    }

    log.info(userId, 'Flushed outbox. SessionId: ' + sessionId + '. Response: ' +
        JSON.stringify(commands));//.substring(0, 100));

    return commands;
};

exports.length = function *(userId, sessionId) {
    // TBD Add helper concat('outbox', userId, sessionId)
    return parseInt(yield redis.llen('outbox:' + userId + ':' + sessionId));
};
