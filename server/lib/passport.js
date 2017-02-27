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

const passport = require('koa-passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const usersService = require('../services/users');
const log = require('../lib/log');
const conf = require('./conf');

setup();

module.exports = passport;

function setup() {
    if (conf.get('googleauth:enabled')) {
        const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
        const jwt = require('jwt-simple');

        const google = new GoogleStrategy({
            clientID: conf.get('googleauth:client_id'),
            clientSecret: conf.get('googleauth:client_secret'),
            callbackURL: `${conf.getComputed('site_url')}/auth/google/oauth2callback`
        }, (accessToken, refreshToken, params, profile, done) => {
            const openIdId = jwt.decode(params.id_token, null, true).openid_id;
            authExt(openIdId, `google:${profile.id}`, profile, done);
        });

        passport.use(google);
    }

    if (conf.get('yahooauth:enabled')) {
        const YahooStrategy = require('passport-yahoo').Strategy;
        const yahoo = new YahooStrategy({
            returnURL: `${conf.getComputed('site_url')}/auth/yahoo/callback`,
            realm: conf.getComputed('site_url')
        }, (openIdId, profile, done) => {
            authExt(openIdId, null, profile, done);
        });

        passport.use(yahoo);
    }

    if (conf.get('cloudronauth:enabled')) {
        const CloudronStrategy = require('passport-cloudron');
        const cloudron = new CloudronStrategy({
            callbackURL: `${conf.getComputed('site_url')}/auth/cloudron/callback`
        }, (token, tokenSecret, profile, done) => {
            authExt(profile.id, null, {
                displayName: profile.username,
                emails: [ { value: profile.email } ]
            }, done);
        });

        passport.use(cloudron);
    }

    const local = new LocalStrategy(authLocal);
    passport.use(local);
}

async function authLocal(username, password, done) {
    if (!username) {
        return;
    }

    const user = await User.findFirst({
        [username.includes('@') ? 'email' : 'nick']: username
    });

    if (!user || user.get('deleted')) {
        await done('invalid', false);
        return;
    }

    if (user && !user.get('password') && user.get('extAuthId')) {
        await done('useExt', false);
        return;
    }

    const correctPassword = await user.verifyPassword(password);

    if (correctPassword && user.get('inUse')) {
        await done(null, user);
    } else {
        await done('invalid', false);
    }
}

async function authExt(openidId, oauthId, profile, done) {
    let user = null;

    if (oauthId) {
        user = await User.findFirst({ extAuthId: oauthId });
    } else if (openidId) {
        user = await User.findFirst({ extAuthId: openidId });
    }

    if (!user) {
        log.info('Unknown OAuth user logins, creating a user record automatically');

        user = await usersService.addUser({
            name: profile.displayName,
            nick: null,
            email: profile.emails[0].value,
            extAuthId: oauthId || openidId,
            inUse: false // authentication is not yet complete
        }, { skipSetters: true });

        if (!user) {
            await done(
                'An account with this email address already exists. Login with password.', false);
            return;
        }
    }

    await done(null, user);
}
