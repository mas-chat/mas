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
    await passport.authenticate('local', async (err, user, info) => {
        if (user) {
            await createAuthSession(ctx, user);
            ctx.body = { success: true };
        } else {
            ctx.body = { success: false, msg: info.message };
        }
    })(ctx);
};

exports.externalLogin = function externalLogin(provider) {
    return async ctx => {
        await passport.authenticate(provider, async (err, user, info) => {
            if (user) {
                await createAuthSession(ctx, user);
                ctx.redirect(user.get('inUse') ? '/app' : '/register?ext=true');
            } else {
                ctx.body = `External login failed, reason: ${err || info.message}`;
                log.warn(`Invalid external login, err: ${util.inspect(err || info.message)}`);
            }
        })(ctx);
    };
};

async function createAuthSession(ctx, user) {
    const session = await authSesssionService.create(user.id, ctx.request.ip);

    ctx.cookies.set('mas', session.encodeToCookie(), {
        maxAge: ONE_WEEK_IN_MS,
        httpOnly: false
    });
}
