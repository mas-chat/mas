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

var r = require('redis').createClient(),
    Q = require('q');

module.exports = exports = User;

function User(details, settings, friends) {
    this.data = details;
    this.settings = settings;
    this.friends = friends;

    // Initialize additional variables
    this.data.nextwindowid = 0;

}

User.prototype.save = function *() {
    var index = {};
    index[this.data.nick] = this.data.userid,
    index[this.data.email] = this.data.userid

    var promises = [
        Q.nsend(r, 'hmset', 'user:' + this.data.userid, this.data),
        Q.nsend(r, 'hmset', 'index:user', index),
        Q.nsend(r, 'sadd', 'userlist', this.data.userid),
        Q.nsend(r, 'hmset', 'settings:' + this.data.userid, this.settings)
    ];

    if (this.friends.length > 0) {
        promises.push(Q.nsend(r, 'sadd', 'friends:' + this.data.userid,
            this.friends));
    }

    yield promises;
}