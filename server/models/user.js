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
    redis = require('../lib/redis').createClient();

const RESERVED_USERIDS = 9000;

module.exports = exports = User;

function User(details, settings, friends) {
    this.data = details;
    this.settings = settings;
    this.friends = friends;

    // Initialize additional variables
    this.data.nextwindowid = -1;
    this.data['currentnick:MAS'] = this.data.nick;
}

User.prototype.setFinalPasswordSha = function (passwd) {
    var passwordSha = crypto.createHash('sha256').update(passwd, 'utf8').digest('hex');
    this.addSalt(passwordSha);
};

User.prototype.addSalt = function (sha) {
    // 64-bit salt
    var salt = crypto.randomBytes(8).toString('hex');

    this.data.salt = salt;
    this.data.passwd = crypto.createHash('sha256').update(sha + salt, 'utf8').digest('hex');
};

User.prototype.generateUserId = function *() {
    var userId = yield redis.incr('nextavailableuserid');
    userId += RESERVED_USERIDS;
    this.data.userid = userId;
};

User.prototype.save = function *() {
    var index = {};
    index[this.data.nick] = this.data.userid;
    index[this.data.email] = this.data.userid;

    yield redis.hmset('user:' + this.data.userid, this.data);
    yield redis.hmset('index:user', index);
    yield redis.sadd('userlist', this.data.userid);

    if (this.settings.length > 0) {
        yield redis.hmset('settings:' + this.data.userid, this.settings);
    }

    if (this.friends.length > 0) {
        // TBD: Check if this is correct, this.friends is array
        yield redis.sadd('friends:' + this.data.userid, this.friends);
    }
};