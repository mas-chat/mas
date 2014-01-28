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

var crypto = require('crypto'),
    r = require('redis').createClient(),
    Q = require('q'),
    parse = require('co-body');

module.exports = {
    // POST /login
    create: function *() {
        var body = yield parse.form(this);
        var password = body.password;
        var passwordSha = crypto.createHash('sha256').update(password,
                'utf8').digest('hex');
        var user = null;

        var userId = yield Q.nsend(r, 'hget', 'index:user', body.emailOrNick);

        if (userId) {
            user = yield Q.nsend(r, 'hgetall', 'user:' + userId);
        }

        if (!userId || user.passwd !== passwordSha || user.inuse === 0) {
            // Unknown user, wrong password, or disabled account
            this.body = {
               success: false,
               msg: 'Wrong password or ...'
            };
        } else {
            var useSsl = yield Q.nsend(r, 'hget', 'settings:' + userId, 'sslEnabled');
            var unixTime = Math.round(new Date().getTime() / 1000);
            var update = null;

            // TBD: Use word secret everywhere. Rename cookie_expires to cookieExpires

            /* jshint -W106 */
            if (!(user.cookie > 0 && unixTime < user.cookie_expires)) {
                // Time to generate new secret
                update = {
                    cookie: Math.floor(Math.random() * 100000001) + 100000000,
                    cookie_expires: unixTime + (60 * 60 * 24 * 14)
                };

                // Save secret to Redis
                yield Q.nsend(r, 'hmset', 'user:' + userId, update);
            }
            /*jshint +W106 */

            this.body = {
                success: true,
                userId: userId,
                secret: update.cookie || user.cookie,
                useSsl: useSsl
            };
        }
    }
};



