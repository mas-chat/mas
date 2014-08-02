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
    co = require('co'),
    jwt = require('jwt-simple'),
    passport = require('koa-passport'),
    LocalStrategy = require('passport-local').Strategy,
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    YahooStrategy = require('passport-yahoo').Strategy,
    redis = require('./redis').createClient(),
    User = require('../models/user'),
    conf = require('./conf');

// TBD: Rename Redis user.openidurl property to user.extAuthToken

function authLocal(username, password, done) {
    co(function *() {
        var user = null;
        var userId = null;
        var passwordSha, passwordShaNoSalt;

        if (username) {
            userId = yield redis.hget('index:user', username.toLowerCase());
        }

        if (userId) {
            user = yield redis.hgetall('user:' + userId);

            passwordShaNoSalt = crypto.createHash('sha256').update(password, 'utf8').digest('hex');
            passwordSha = crypto.createHash('sha256').update(
                passwordShaNoSalt + user.salt, 'utf8').digest('hex');
        }

        if (userId && user.openidurl) {
            done('useExt', false);
        } else if (!userId || user.passwd !== passwordSha || user.inuse === 0) {
            done('invalid', false);
        } else {
            done(null, userId);
        }
    })();
}

function authExt(openidId, oauthId, profile, done) {
    co(function *() {
        // Some old users are known by their google OpenID 2.0 identifier. Google is closing down
        // OpenID support so always convert in that case to OAuth 2.0 id.

        var userId = yield redis.hget('index:user', openidId);

        if (oauthId) {
            if (userId) {
                // User is identified by his OpenID 2.0 identifier even we know his OAuth 2.0 id.
                // Start to solely use OAuth 2.0 id.
                yield redis.hset('user:' + userId, 'openidurl', oauthId);
                yield redis.hdel('index:user', openidId);
                yield redis.hset('index:user', oauthId, userId);
            } else {
                userId = yield redis.hget('index:user', oauthId);
            }
        }

        if (userId === null) {
            var user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                extAuthId: oauthId || openidId,
                inuse: '0'
            }, {}, {});

            userId = yield user.generateUserId();
            yield user.save();
        }

        done(null, userId);
    })();
}

var google = new GoogleStrategy({
    clientID: conf.get('googleauth:client_id'),
    clientSecret: conf.get('googleauth:client_secret'),
    callbackURL: conf.get('site:url') + '/auth/google/oauth2callback'
}, function(accessToken, refreshToken, params, profile, done) {
    var openIdId = jwt.decode(params.id_token, null, true).openid_id;
    authExt(openIdId, 'google:' + profile.id, profile, done);
});

var yahoo = new YahooStrategy({
    returnURL: conf.get('site:url') + '/auth/yahoo/callback',
    realm: conf.get('site:url')
}, function(openIdId, profile, done) {
    authExt(openIdId, null, profile, done);
});

var local = new LocalStrategy(authLocal);

passport.use(google);
passport.use(yahoo);
passport.use(local);

module.exports = passport;
