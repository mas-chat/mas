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

let redis = require('../lib/redis').createClient();

module.exports = function authenticate() {
    return function *authenticate(next) {
        let valid = true;
        let userId, secret, data;
        let cookie = this.cookies.get('auth');
        let ts = Math.round(Date.now() / 1000);

        if (!cookie) {
            valid = false;
        }

        if (valid) {
            data = cookie.split('-');

            if (data.length !== 3) {
                valid = false;
            } else {
                userId = data[0];
                secret = data[1];

                if (!userId || !secret) {
                    valid = false;
                }
            }
        }

        let user;

        if (valid) {
            user = yield redis.hgetall('user:' + userId);

            if (!(user && user.secretExpires > ts && user.secret === secret)) {
                valid = false;
            }
        }

        this.mas = this.mas || {};
        this.mas.userId = valid ? userId : null;
        this.mas.email = valid ? user.email : null;
        this.mas.inUse = valid ? user.inuse === 'true' : null;

        yield next;
    };
};
