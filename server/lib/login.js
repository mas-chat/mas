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

var crypto = require('crypto'),
    mysql = require('mysql');

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'ircuser',
    password: 'zeppelin',
    database: 'milhouse'
});

function init() {
    connection.connect();
}

exports.handleLogin = function(req, res) {
    var name = req.body.emailOrNick;
    var password = req.body.password;
    var passwordSha =
            crypto.createHash('sha256').update(password, 'utf8').digest('hex');
    var searchUsing = 'email';

    if (name.indexOf('@') === -1) {
        // User is using his nick, not email address.
        searchUsing = 'nick';
    }

    connection.query(
        'SELECT passwd, userid, inuse, cookie, cookie_expires, settings, ' +
            'server FROM users WHERE ' + searchUsing + ' = ?', [name],
        function(err, rows) {
            if (err) {
                res.json({
                    success: false,
                    msg: 'Database error.'
                });
                return;
            }

            if (rows.length === 0 || rows[0].passwd.toString('utf-8') !==
             passwordSha || rows[0].inuse === 0) {
                // Unknown user, wrong password, or disabled account
            res.json({
                success: false,
                msg: "Wrong password or ..."
            });
        } else {
            var userId = rows[0].userid;
                var secret = rows[0].cookie;
                var secretExpires = rows[0].cookie_expires;
                var settings = rows[0].settings.toString('utf-8');
                var useSsl = false;

                // Settings are in stupid 'key||value' format..
                if (settings.indexOf('sslEnabled||1') !== -1) {
                    useSsl = true;
                }

                var unixTime = Math.round(new Date().getTime() / 1000);

                if (!(secret > 0 && unixTime < secretExpires)) {
                    // Time to generate new secret
                    secret = Math.floor(Math.random() * 100000001) + 100000000;
                    secretExpires = unixTime + (60 * 60 * 24 * 14);

                    // Save secret to DB
                    connection.query(
                        'UPDATE users SET cookie = ?, cookie_expires = ? ' +
                        'WHERE userid = ?',
                        [secret, secretExpires, userId], function (err, rows) {
                        // TODO
                    });
                }

                res.json({
                    success: true,
                    userId: userId,
                    secret: secret,
                    useSsl: useSsl
                });
            }
        });
};

init();
