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

var passport = require('../lib/passport'),
    log = require('../lib/log'),
    redis = require('../lib/redis').createClient(),
    cookie = require('../lib/cookie');

exports.localLogin = function *(next) {
    var that = this;

    yield passport.authenticate('local', function *(err, userId) {
        if (err || userId === false) {
            // Unknown user, wrong password, or disabled account
            that.body = {
                success: false,
                msg: 'Incorrect password or nick/email.'
            };
        } else {
            that.body = yield cookie.createSession(userId);
            that.body.success = true;
        }
    }).call(this, next);
};

exports.googleLogin = function *(next) {
    var that = this;

    yield passport.authenticate('google', function *(err, userId) {
        if (err || userId === false) {
            log.warn('Invalid external login attempt.');
            return;
        }

        log.info('External login finished');

        var resp = yield cookie.createSession(userId);
        cookie.set(userId, resp.secret, resp.expires, that);

        var inUse = yield redis.hget('user:' + userId, 'inuse');

        if (inUse === '1') {
            that.redirect('/app/');
        } else {
            that.redirect('/register?ext=true');
        }
    }).call(this, next);
};
