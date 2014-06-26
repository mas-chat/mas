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
    log = require('../lib/log'),
    redis = require('../lib/redis').createClient(),
    conf = require('../lib/conf');

module.exports = function *(next) {
    log.info('Authenticating.');

    var cookie = this.cookies.get('ProjectEvergreen');
    var sessionId = this.params.sessionId;

    if (!cookie) {
        respond(this, 'unauthorized', 'Invalid cookie.');
        return;
    }

    var data = cookie.split('-');

    if (!data) {
        respond(this, 'unauthorized', 'Invalid cookie.');
        return;
    }

    var userId = data[0];
    var secret = data[1]; // TBD: bad name

    var validUser = yield validateUser(userId, secret);

    if (!validUser) {
        log.warn(userId, 'Invalid user.');
        respond(this, 'unauthorized', 'Invalid user.');
        return;
    }

    var validSession = yield validateSession(userId, sessionId);

    if (validSession === false) {
        respond(this, 'not acceptable', 'Invalid session.');
        return;
    }

    log.info(userId, 'Valid user and session.');

    this.mas = this.mas || {};
    var ts = Math.round(Date.now() / 1000);

    if (sessionId === '0') {
        //New session, generate session id
        this.mas.newSession = true;
        sessionId = uuid.v4();

        yield redis.hmset('session:' + userId + ':' + sessionId, 'sendRcvNext', 0,
            'listenRcvNext', 0);
    }

    // TDB Race condition possible ?
    yield redis.zadd('sessionlist:' + userId, ts, sessionId);
    yield redis.zadd('sessionlastrequest', ts, userId + ':' + sessionId);

    this.mas.sessionId = sessionId;
    this.mas.userId = userId;

    yield next;
};

function *validateUser(userId, secret) {
    var ts = Math.round(Date.now() / 1000);

    if (!userId) {
        return false;
    }

    var expected = yield redis.hmget('user:' + userId, 'cookie_expires', 'cookie');

    if (expected && expected[0] > ts && expected[1] === secret) {
        return true;
    } else {
        return false;
    }
}

function *validateSession(userId, sessionId) {
    var sessionExists = yield redis.zrank('sessionlist:' + userId, sessionId);

    if (sessionId === '0') {
        // Limit parallel sessions
        var sessionCount = yield redis.zcard('sessionlist:' + userId);
        if (sessionCount > conf.get('session:max_parallel')) {
            var oldestSession = yield redis.zrange('sessionlist:' + userId, 0, 0);
            yield redis.run('deleteSession', userId, oldestSession);

            log.info(userId, 'Too many sessions. Removing the oldest');
        }
    } else if (sessionExists === null) {
        log.warn(userId, 'Invalid session.');
        return false;
    }

    return true;
}

function respond(ctx, code, msg) {
    ctx.status = httpStatus(code);
    ctx.body = msg;
}
