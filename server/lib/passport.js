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
    GoogleStrategy = require('passport-google').Strategy,
    YahooStrategy = require('passport-yahoo').Strategy,
    redis = require('./redis').createClient(),
    User = require('../models/user'),
    conf = require('./conf');

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

        if (!userId || user.passwd !== passwordSha || user.inuse === 0) {
            done(null, false);
        } else {
            done(null, userId);
        }
    })();
}

function authOpenId(identifier, profile, done) {
    co(function *() {
        var userId = yield redis.hget('index:user', identifier);

        if (userId === null) {
            var user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                extAuthId: identifier,
                inuse: '0'
            }, {}, {});

            userId = yield user.generateUserId();
            yield user.save();
        }

        done(null, userId);
    })();
}

var google = new GoogleStrategy({
    returnURL: conf.get('site:url') + '/auth/google/callback',
    realm: conf.get('site:url')
}, authOpenId);

var yahoo = new YahooStrategy({
    returnURL: conf.get('site:url') + '/auth/yahoo/callback',
    realm: conf.get('site:url')
}, authOpenId);

var local = new LocalStrategy(authLocal);

passport.use(google);
passport.use(yahoo);
passport.use(local);

module.exports = passport;
