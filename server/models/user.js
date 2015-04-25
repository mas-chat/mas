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

const bcrypt = require('bcrypt'),
      md5 = require('MD5'),
      log = require('../lib/log'),
      redis = require('../lib/redis').createClient();

const RESERVED_USERIDS = 9000;

module.exports = exports = User;

function User(details, settings, friends) {
    if (!details) {
        // Create empty an user object that can be initialized with load()
        return;
    }

    this.data = details;
    this.settings = settings;
    this.friends = friends;

    // Initialize additional variables
    this.data.nextwindowid = -1;
}

User.prototype.load = function*(userId) {
    this.data = yield redis.hgetall(`user:${userId}`);

    this.settings = yield redis.hgetall(`settings:${userId}`);
    this.friends = yield redis.smembers(`friends:${userId}`);

    if (this.settings === null) {
        this.settings = {};
    }

    if (this.friends === null) {
        this.friends = [];
    }
};

User.prototype.setPassword = function(password) {
    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(password, salt);
    this.data.password = 'bcrypt:' + hash;
};

User.prototype.generateUserId = function*() {
    let userId = yield redis.incr('nextGlobalUserId');
    userId = 'm' + (userId + RESERVED_USERIDS);
    this.data.userId = userId;
    return userId;
};

User.prototype.save = function*() {
    let index = {};
    let userId = this.data.userId;

    if (this.data.nick) {
        let normalizedNick = this.data.nick.toLowerCase().trim();
        index[normalizedNick] = userId;
    }

    if (this.data.email) {
        let normalizedEmail = this.data.email.toLowerCase().trim();

        index[normalizedEmail] = userId;
        this.data.emailMD5 = md5(normalizedEmail); // For gravatar support
    } else {
        log.warn(userId, 'No email is defined while saving User model.');
    }

    if (this.data.extAuthId) {
        index[this.data.extAuthId] = userId;
    }

    yield redis.hmset(`user:${userId}`, this.data);
    yield redis.hmset('index:user', index);
    yield redis.sadd('userlist', userId);

    if (Object.keys(this.settings).length > 0) {
        yield redis.hmset(`settings:${userId}`, this.settings);
    }

    if (this.friends.length > 0) {
        yield redis.sadd(`friends:${userId}`, this.friends);
    }
};

User.prototype.delete = function*() {
    let userId = this.data.userId;

    yield redis.hmset(`user:${userId}`, {
        deleted: 'true',
        deletionTime: Math.round(Date.now() / 1000)
    });

    // Free email address and extAuthId but not nick. Nicks are kept forever to not to
    // break conversation logs.
    yield redis.hdel('index:user', this.data.email.toLowerCase().trim());
    yield redis.hdel('index:user', this.data.extAuthId);

    yield redis.del(`settings:${userId}`);

    yield redis.del(`activealerts:${userId}`);
};
