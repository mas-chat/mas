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

const passport = require('../lib/passport'),
      log = require('../lib/log'),
      redis = require('../lib/redis').createClient(),
      cookie = require('../lib/cookie');

exports.localLogin = function*(next) {
    let that = this;

    yield passport.authenticate('local', function*(err, userId) {
        if (err === 'useExt') {
            that.body = {
                success: false,
                msg: 'This email address can login only through Google/Yahoo login.'
            };
        } else if (err || userId === false) {
            // Unknown user, wrong password, or disabled account
            that.body = {
                success: false,
                msg: 'Incorrect password or nick/email.'
            };
        } else {
            yield updateIpAddress(that, userId);
            that.body = yield cookie.createSession(userId);
            that.body.success = true;
        }
    }).call(this, next);
};

exports.googleLogin = function*(next) {
    yield auth(this, next, 'google');
};

exports.yahooLogin = function*(next) {
    yield auth(this, next, 'yahoo');
};

function *auth(ctx, next, provider) {
    yield passport.authenticate(provider, function*(err, userId) {
        if (err) {
            ctx.body = 'External login failed, reason: ' + err;
            log.warn('Invalid external login attempt, reason: ' + err);
            return;
        } else if (userId === false) {
            ctx.body = 'No account found. Login failed.';
            return;
        }

        log.info('External login finished');

        let resp = yield cookie.createSession(userId);
        cookie.set(userId, resp.secret, resp.expires, ctx);

        let inUse = yield redis.hget(`user:${userId}`, 'inuse');

        if (inUse === 'true') {
            yield updateIpAddress(ctx, userId);
            ctx.redirect('/app/');
        } else {
            ctx.redirect('/register?ext=true');
        }
    }).call(ctx, next);
}

function *updateIpAddress(ctx, userId) {
    yield redis.hset(`user:${userId}`, 'lastip', ctx.req.connection.remoteAddress);
}
