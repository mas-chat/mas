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

var wrapper = require('co-redis'),
    redis = wrapper(require('redis').createClient());

module.exports = function *(next) {
    w.info('Authenticating.');

    var cookie = this.cookies.get('ProjectEvergreen');
    var sessionId = parseInt(this.params.sessionId);

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
        w.info('Invalid user.');
        respond('unauthorized', 'Invalid user.');
        return;
    }

    var validSession = yield validateSession(userId, sessionId);

    if (!validSession) {
        w.info('Invalid session.');
        respond('not acceptable', 'Invalid session.');
        return;
    }

    w.info('Valid user and session.');

    this.mas = this.mas || {};

    if (sessionId === 0) {
        //New session, generate session id
        this.mas.newSession = true;
        sessionId = Math.floor((Math.random() * 10000000) + 1);
        yield redis.hset('user:' + userId, 'sessionId', sessionId);
    }

    this.mas.sessionId = sessionId;
    this.mas.userId = userId;

    yield next;
};

function *validateUser(userId, secret) {
    var unixTime = Math.round(new Date().getTime() / 1000);

    if (!userId) {
        return false;
    }

    var expected = yield redis.hmget('user:' + userId, 'cookie_expires', 'cookie');

    if (expected && expected[0] > unixTime && expected[1] === secret) {
        return true;
    } else {
        return false;
    }
}

function *validateSession(userId, sessionId) {
    var expectedSessionId = parseInt(yield redis.hget('user:' + userId, 'sessionId'));

    if (sessionId === 0 || sessionId === expectedSessionId) {
        return true;
    } else {
        return false;
    }
}

function respond(ctx, code, msg) {
    ctx.status = code;
    ctx.body = msg;
}
