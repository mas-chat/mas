//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
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

var redis = require('./redis').createClient(),
    outbox = require('./outbox'),
    conf = require('./conf');

exports.sendNick = function *(userId, sessionId) {
    var command = {
        id: 'NICK'
    };

    var redisParams = [ 'user:' + userId ];
    var networks = [];

    for (var network in conf.get('irc:networks')) { /* jshint -W089 */
        redisParams.push('currentnick:' + network);
        networks.push(network);
    }

    var nicks = yield redis.hmget.apply(redis, redisParams);

    for (var i = 0; i < networks.length; i++) {
        if (nicks[i] !== null) {
            command[networks[i]] = nicks[i];
        }
    }

    sessionId = sessionId; // TBD Send to queue()?
    yield outbox.queue(userId, command);
};