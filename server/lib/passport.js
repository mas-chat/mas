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

const uuid = require('uid2');
const jwt = require('jwt-simple');
const passport = require('koa-passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const YahooStrategy = require('passport-yahoo').Strategy;
const CloudronStrategy = require('passport-cloudron');
const User = require('../models/user');
const usersService = require('../services/users');
const log = require('../lib/log');

const conf = require('./conf');

exports.initialize = function initialize() {
    setup();
    return passport.initialize();
};

exports.authenticate = function authenticate(type, cb) {
    return passport.authenticate(type, cb);
};

function setup() {
    if (conf.get('googleauth:enabled')) {
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
        const yahoo = new YahooStrategy({
            returnURL: `${conf.getComputed('site_url')}/auth/yahoo/callback`,
            realm: conf.getComputed('site_url')
        }, (openIdId, profile, done) => {
            authExt(openIdId, null, profile, done);
        });

        passport.use(yahoo);
    }

    if (conf.get('cloudronauth:enabled')) {
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
        done('invalid', false);
        return;
    }

    if (user && !user.get('password') && user.get('extAuthId')) {
        done('useExt', false);
        return;
    }

    const correctPassword = await user.verifyPassword(password);

    if (correctPassword && user.get('inUse')) {
        done(null, user);
    } else {
        done('invalid', false);
    }
}

async function authExt(openidId, oauthId, profile, done) {
    // Some old users are known by their google OpenID 2.0 identifier. Google is closing down
    // OpenID support so always convert in that case to OAuth 2.0 id.
    let user = await User.findFirst({ extAuthId: openidId });

    if (user && oauthId) {
        // User is identified by his OpenID 2.0 identifier even we know his OAuth 2.0 id.
        // Start to solely use OAuth 2.0 id.
        await user.set('extAuthId', oauthId);
    } else if (oauthId) {
        user = await User.findFirst({ extAuthId: oauthId });
    }

    if (!user) {
        log.info('Unknown OAuth user logins, creating a user record automatically');

        user = await usersService.addUser({
            name: profile.displayName,
            email: profile.emails[0].value,
            extAuthId: oauthId || openidId,
            password: uuid(24), // record must have a password, create random one that won't be used
            inUse: false // authentication is not yet complete
        });
    }

    done(null, user);
}
