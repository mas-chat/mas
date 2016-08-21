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

const passport = require('../lib/passport');
const log = require('../lib/log');
const cookie = require('../lib/cookie');

exports.localLogin = function *localLogin(next) {
    const that = this;

    yield passport.authenticate('local', function *authenticate(err, user) {
        let success = false;
        let msg;

        if (err === 'useExt') {
            msg = 'This email address can login only through Google/Yahoo login.';
        } else if (err || !user) {
            // Unknown user, wrong password, or disabled account
            msg = 'Incorrect password or nick/email.';
        } else {
            yield user.set('lastIp', that.req.connection.remoteAddress);
            yield cookie.createSession(user, that);
            success = true;
        }

        that.body = { success, msg, userId: user.id, secret: user.get('secret') };
    }).call(this, next);
};

exports.googleLogin = function *googleLogin(next) {
    yield auth(this, next, 'google');
};

exports.yahooLogin = function *yahooLogin(next) {
    yield auth(this, next, 'yahoo');
};

exports.cloudronLogin = function *cloudronLogin(next) {
    yield auth(this, next, 'cloudron');
};

function *auth(ctx, next, provider) {
    yield passport.authenticate(provider, function *authenticate(err, user) {
        if (err) {
            ctx.body = `External login failed, reason: ${err}`;
            log.warn(`Invalid external login attempt, reason: ${err}`);
            return;
        } else if (!user) {
            ctx.body = 'No account found. Login failed.';
            return;
        }

        log.info('External login finished');

        yield cookie.createSession(user, ctx);

        if (user.get('inUse')) {
            // TODO: yield updateIpAddress(ctx, userId);
            ctx.redirect('/app/');
        } else {
            ctx.redirect('/register?ext=true');
        }
    }).call(ctx, next);
}
