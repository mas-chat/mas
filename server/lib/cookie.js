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

var uuid = require('uid2'),
    redis = require('../lib/redis').createClient();

exports.createSession = function*(userId) {
    var user = yield redis.hgetall('user:' + userId);
    var ts = Math.round(Date.now() / 1000);
    var secret = user.secret;
    var expires = user.secretExpires;

    // TBD: Use word secret everywhere.

    if (!secret || ts > expires) {
        // We need to generate new secret
        expires = ts + (60 * 60 * 24 * 14);
        secret = uuid(20);

        // Save secret to Redis
        yield redis.hmset('user:' + userId, {
            secret: secret,
            secretExpires: expires
        });
    }

    return {
        userId: userId,
        secret: secret,
        expires: expires
    };
};

exports.set = function(userId, secret, expires, ctx) {
    ctx.cookies.set('auth', userId + '-' + secret + '-n', {
        expires: new Date(expires * 1000),
        path: '/',
        httpOnly: false
    });
};
