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
    log = require('../lib/log'),
    redis = require('../lib/redis').createClient();

const SESSION_LIMIT = 8;
const OK = 0, TOO_MANY_SESSIONS = 1, INVALID_SESSION = 2;

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

    if (validSession === INVALID_SESSION) {
        respond(this, 'not acceptable', 'Invalid session.');
        return;
    } else if (validSession === TOO_MANY_SESSIONS) {
        respond(this, 'too many requests', 'Too many sessions opened. Limit is: ' + SESSION_LIMIT);
        return;
    }

    log.info(userId, 'Valid user and session.');

    this.mas = this.mas || {};

    if (sessionId === '0') {
        //New session, generate session id
        this.mas.newSession = true;
        sessionId = uuid.v4();

        yield redis.sadd('sessionlist:' + userId, sessionId);
        yield redis.hmset('session:' + userId + ':' + sessionId, 'sendRcvNext', 0,
            'listenRcvNext', 0);
    }

    var ts = Math.round(Date.now() / 1000);
    // TDB Race condition possible
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
    var retval = OK;
    var sessionExists = yield redis.sismember('sessionlist:' + userId, sessionId);

    if (sessionId === '0') {
        // Limit parallel sessions
        var sessionCount = yield redis.scard('sessionlist:' + userId);
        if (sessionCount > SESSION_LIMIT) {
            log.info(userId, 'Too many sessions.');
            retval = TOO_MANY_SESSIONS;
        }
    } else if (!sessionExists) {
        log.warn(userId, 'Invalid session.');
        retval = INVALID_SESSION;
    }

    return retval;
}

function respond(ctx, code, msg) {
    ctx.status = code;
    ctx.body = msg;
}
