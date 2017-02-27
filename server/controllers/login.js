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

const util = require('util');
const passport = require('../lib/passport');
const log = require('../lib/log');
const authSesssionService = require('../services/authSession');

const ONE_WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

exports.localLogin = async function localLogin(ctx) {
    await (passport.authenticate('local', {}, async (user, err) => {
        let success = false;
        let msg;

        if (err === 'useExt') {
            msg = 'This email address can login only through Google/Yahoo login.';
        } else if (err || !user) {
            // Unknown user, wrong password, or disabled account
            msg = 'Incorrect password or nick/email.';
        } else {
            msg = 'Successful login';

            const cookie = authSesssionService.encodeToCookie(
                (await authSesssionService.create(user.id, ctx.request.ip)));

            ctx.cookies.set('mas', cookie, { maxAge: ONE_WEEK_IN_MS, httpOnly: false });
            success = true;
        }

        ctx.body = { success, msg };
    })(ctx));
};

exports.googleLogin = async function googleLogin(ctx) {
    await auth(ctx, 'google');
};

exports.yahooLogin = async function yahooLogin(ctx) {
    await auth(ctx, 'yahoo');
};

exports.cloudronLogin = async function cloudronLogin(ctx) {
    await auth(ctx, 'cloudron');
};

async function auth(ctx, provider) {
    await (passport.authenticate(provider, {}, async (user, err) => {
        if (!user) {
            ctx.body = `External login failed, reason: ${err}`;
            log.warn(`Invalid external login, u: ${util.inspect(user)}, err: ${util.inspect(err)}`);
            return;
        }

        log.info('External login finished');

        const cookie = authSesssionService.encodeToCookie(
            (await authSesssionService.create(user.id, ctx.request.ip)));

        ctx.cookies.set('mas', cookie, { maxAge: ONE_WEEK_IN_MS, httpOnly: false });

        if (user.get('inUse')) {
            ctx.redirect('/app/');
        } else {
            ctx.redirect('/register?ext=true');
        }
    })(ctx));
}
