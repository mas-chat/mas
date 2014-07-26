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

var redis = require('../lib/redis').createClient();

exports.createSession = function *(userId) {
    /* jshint -W106 */
    var user = yield redis.hgetall('user:' + userId);
    var useSsl = yield redis.hget('settings:' + userId, 'sslEnabled');
    var ts = Math.round(Date.now() / 1000);
    var cookie = user.cookie;
    var expires = user.cookie_expires;

    // TBD: Use word secret everywhere. Rename cookie_expires to cookieExpires

    if (!(cookie > 0 && ts < expires)) {
        // We need to generate new secret
        expires = ts + (60 * 60 * 24 * 14);
        cookie = Math.floor(Math.random() * 100000001) + 100000000;

        // Save secret to Redis
        yield redis.hmset('user:' + userId, {
            cookie: cookie,
            cookie_expires: expires
        });
    }
    /*jshint +W106 */

    return {
        userId: userId,
        secret: cookie,
        expires: expires,
        useSsl: useSsl
    };
};

exports.set = function(userId, secret, expires, ctx) {
    ctx.cookies.set('ProjectEvergreen', userId + '-' + secret + '-n', {
        expires: new Date(expires * 1000),
        path: '/',
        httpOnly: false
    });
};
