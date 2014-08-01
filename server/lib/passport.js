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

function authExt(openid_id, oauth_id, profile, done) {
    co(function *() {
        // Some old users are known by their google OpenID 2.0 identifier. Google is closing down
        // OpenID support so always convert in that case to OAuth 2.0 id.

        var userId = yield redis.hget('index:user', openid_id);

        if (oauth_id) {
            if (userId) {
                // User is identified by his OpenID 2.0 identifier even we know his OAuth 2.0 id.
                // Start to solely use OAuth 2.0 id.
                yield redis.hset('user:' + userId, 'openidurl', oauth_id);
                yield redis.hdel('index:user', openid_id);
                yield redis.hset('index:user', oauth_id, userId);
            } else {
                userId = yield redis.hget('index:user', oauth_id);
            }
        }

        if (userId === null) {
            var user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                extAuthId: oauth_id || openid_id,
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
}, function(openid_id, tokenSecret, profile, done) {
    // profile.id is google's oauth_id
    authExt('https://www.google.com/accounts/o8/id?id=' + openid_id,
        'google:' + profile.id, profile, done);
});

// A trick to force Google to return OpenID 2.0 identifier in addition to OAuth 2.0 id
google.authorizationParams = function(options) {
    return { 'openid.realm': '' };
}

var yahoo = new YahooStrategy({
    returnURL: conf.get('site:url') + '/auth/yahoo/callback',
    realm: conf.get('site:url')
}, function(identifier, profile, done) {
    authExt(identifier, null, profile, done);
});

var local = new LocalStrategy(authLocal);

passport.use(google);
passport.use(yahoo);
passport.use(local);

module.exports = passport;
