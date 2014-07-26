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

var uuid = require('node-uuid'),
    httpStatus = require('statuses'),
    log = require('./log'),
    redis = require('./redis').createClient(),
    conf = require('./conf');

module.exports = function *(next) {
    var userId = this.mas.userId;
    var sessionId = this.params.sessionId;

    log.info('Authenticating.');

    if (userId === null) {
        respond(this, 'unauthorized', 'Invalid cookie.');
        return;
    }

    if (!this.mas.inUse) {
        respond(this, 'unauthorized', 'Registration not completed.');
        return;
    }

    if (sessionId === '0') {
        // Limit parallel sessions
        var sessionCount = yield redis.zcard('sessionlist:' + userId);
        if (sessionCount > conf.get('session:max_parallel')) {
            var oldestSession = yield redis.zrange('sessionlist:' + userId, 0, 0);
            yield redis.run('deleteSession', userId, oldestSession);

            log.info(userId, 'Too many sessions. Removing the oldest');
        }

        //New session, generate session id
        this.mas.newSession = true;
        sessionId = uuid.v4();

        yield redis.hmset('session:' + userId + ':' + sessionId, 'sendRcvNext', 0,
            'listenRcvNext', 0);
    } else {
        var sessionExists = yield redis.zrank('sessionlist:' + userId, sessionId);

        if (sessionExists === null) {
            log.warn(userId, 'Invalid session.');
            respond(this, 'not acceptable', 'Invalid session.');
            return;
        }
    }

    log.info(userId, 'Valid user and session.');

    // TDB Race condition possible ?
    var ts = Math.round(Date.now() / 1000);
    yield redis.zadd('sessionlist:' + userId, ts, sessionId);
    yield redis.zadd('sessionlastrequest', ts, userId + ':' + sessionId);

    this.mas.sessionId = sessionId;
    this.mas.userId = userId;

    yield next;
};

function respond(ctx, code, msg) {
    ctx.status = httpStatus(code);
    ctx.body = msg;
}
