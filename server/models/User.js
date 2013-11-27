//
//   Copyright 2013 Ilkka Oksanen <iao@iki.fi>
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

// User object hides the storage details of attributes. Information
// that can't be lost is stored in MySQL. Everything else is kept
// in Redis for performance reasons.

var mysql = require('mysql'),
    crypto = require('crypto'),
    nconf = require('nconf').file('config.json');

var connection = mysql.createConnection({
    host: 'localhost',
    user: nconf.get('dbUsername'),
    password: nconf.get('dbPassword'),
    database: 'milhouse'
});

User.getByNickOrEmail = function(nickOrEmail) {

};

function User(obj) {
    for (var key in obj) {
        if (key !== 'id') {
            this[key] = obj[key];
        }
    }
}

User.prototype.save = function() {
    if (this.id) {
        this.update();
    } else {
        var hash = crypto.createHash('sha256');

        // Fields not from the form
        this.passwordSha = hash.update(this.password, 'utf8').digest('hex');
        this.inUse = 0;
        this.token = '';
        this.cookie = '';
        this.cookieExpires = 0;
        this.friends = '';
        this.unFriends = '';
        this.settings = '';
        this.lastIp = '';
        this.maxWindows = 8;
        this.openIdUrl = '';
        this.registrationTime = '1234'; // TBD

        // Legacy options
        this.lastName = '';
        this.gender = 1;
        this.country = '';
        this.hasInvite = 1;
        this.server = 0;
        this.ads = 0;

        connection.query(
            'INSERT INTO users VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', [
            this.name,
            this.lastName,
            this.email,
            this.inUse,
            null, // UserID
            this.passwordSha,
            this.nick,
            this.gender,
            this.token,
            this.cookie,
            this.cookieExpires,
            this.friends,
            this.unFriends,
            this.country,
            this.hasInvite,
            this.settings,
            this.lastIp,
            this.server,
            this.ads,
            this.maxWindows,
            this.openIdUrl,
            this.registrationTime
            ],
            function(err, rows) {
                if (err) {
                    w.error('Database error. Can\'t save new user.');
                }
            });
    }
};

User.prototype.update = function() {

};



module.exports = User;