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

var mysqlDB = require('mysql'),
    redisDB = require("redis"),
    uuid = require('node-uuid'),
    nconf = require('nconf').file('../config.json');

var redis = redisDB.createClient();

var mysql = mysqlDB.createConnection({
    host: 'localhost',
    user: nconf.get('dbUsername'),
    password: nconf.get('dbPassword'),
    database: 'milhouse'
});

var operationsLeft = 0;

function redisCall() {
    operationsLeft++;
}

redis.on("error", function (err) {
    console.log("Error: " + err);
    process.exit(1);
});

redis.flushdb(function() {
    console.log('Flush done.');
    importUsers();
});

// Users
function importUsers() {
    function redisCbUsers() {
        if (--operationsLeft == 0) {
            console.log('All users imported.');
            importWindows();
        }
    }

    var userColumns = [
        'CAST(firstname AS CHAR(100) CHARSET UTF8) AS firstname',
        'CAST(lastname AS CHAR(100) CHARSET UTF8) AS lastname',
        'email',
        'inuse',
        'userid',
        'UNIX_TIMESTAMP(lastlogin) AS lastlogin',
        'CAST(passwd AS CHAR(64) CHARSET ASCII) AS passwd',
        'nick',
        'gender',
        'token',
        'cookie',
        'cookie_expires',
        'friends',
        'country',
        'hasinvite',
        'CAST(settings AS CHAR(2000) CHARSET UTF8) AS settings',
        'lastip',
        'ads',
        'maxwindows',
        'openidurl',
        'UNIX_TIMESTAMP(registrationtime) AS registrationtime'
    ];

    mysql.query('SELECT ' + userColumns.join() +' FROM users',
        function(err, rows) {
            if (err) {
                console.error('MySQL error while fetching user table.');
                process.exit(1);
            }

            console.log('Processing ' + rows.length + ' users.');

            for (var i = 0; i < rows.length && i < 10; i++) {
                var row = rows[i];
                var name;

                // Clean name
                if (row.firstname && row.lastname) {
                    row.name = row.firstname + ' ' + row.lastname;
                } else if (row.firstname) {
                    row.name = row.firstname;
                } else {
                    row.name = row.lastname;
                }
                delete row.firstname;
                delete row.lastname;

                // Take friends list out
                var friends = row.friends.split(':').filter(function(v){ return v !== '' });
                delete row.friends;

                // Take settings out
                var settingsArray = row.settings.split('||');
                var settings = {};
                for (var ii = 0; ii < settingsArray.length; ii += 2 ) {
                    settings[settingsArray[ii]] = settingsArray[ii + 1];
                }
                delete row.settings;

                // Initialize additional variables
                row.nextwindowid = 0;

                redisCall();
                redis.hmset('user:' + row.userid, row, redisCbUsers);

                redisCall();
                redis.sadd('userlist', row.userid, redisCbUsers);

                redisCall();
                redis.hmset('settings:' + row.userid, settings, redisCbUsers);

                redisCall();
                redis.sadd('friends:' + row.userid, friends, redisCbUsers);
            }
        });
}

function importWindows() {
    function redisCbWindows() {
        if (--operationsLeft == 0) {
            console.log('All windows imported.');
            process.exit(0);
        }
    }

    function addWindowEntry(userid, network, name, row) {
        // Get the next window id.
        redis.hincrby('user:' + userid, 'nextwindowid', 1,
            function(error, res) {
                // Save rest
                var windowid = res - 1;

                redisCall();
                redis.hmset('window:' + userid + ':' + windowid, row, redisCbWindows);

                redisCall();
                redis.sadd('windowlist:' + userid, windowid + ':' + network + ':' + name, redisCbWindows);
            });
    }

    mysql.query('SELECT * FROM channels',
        function(err, rows) {
            if (err) {
                console.error('MySQL error while fetching channels table.');
                process.exit(1);
            }

            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];

                // Take friends list out
                var notes = row.notes.split('<>').filter(function(v){ return v !== '' });

                // Take urls out
                var urls = row.urls.split('<>').filter(function(v){ return v !== '' });

                var userid = row.userid;
                var network = row.network;
                var name = row.name;

                delete row.urls;
                delete row.notes;
                delete row.userid;
                delete row.network;
                delete row.id;

                // Save notes
                for (var ii = 0; ii < notes.length; ii++) {
                    var note = {}
                    var noteUuid = uuid.v4();
                    note.ver = 0;
                    note.msg = notes[ii];

                    redisCall();
                    redis.hmset('note:' + noteUuid, note, redisCbWindows);

                    redisCall();
                    redis.sadd('notelist:' + userid + ':' +
                        network + ':' + name, noteUuid, redisCbWindows);
                }

                // Save urls
                for (var ii = 0; ii < urls.length; ii++) {
                    redisCall();
                    redis.sadd('urls:' + userid + ':' +
                        network + ':' + name, urls[ii], redisCbWindows);
                }

                addWindowEntry(userid, network, name, row);
            }
        });
}

//
// user:<userid> (hash)
//   name (string)
//   email (string)
//   inUse (string)
//   lastlogin (int)
//   passwd (string)
//   nick (string)
//   token (string)
//   cookie (string)
//   cookie_expires (int, unix time)
//   lastip (string)
//   ads (int)
//   maxwindows (int)
//   openidurl (string)
//   registrationtime (int, unix time)
//   nextwindowid (int)
//
// users (set)
//   userid1, userid2 ...
//
// friends:<userid> (set)
//   userID1, userId2 ...
//
// settings:<userid> (hash)
//   nameXYZ (string)
//
// windowlist:<userid> (set)
//   id:network:name
//
// window:<userid>:<id> (hash)
//   name (string)
//   x (int)
//   y (int)
//   width (int)
//   height (int)
//   type (int)
//   sound (int)
//   password (string)
//   titlealert (int)
//   hidden (int)
//
// notelist:<userid>:<nwid>:<channel_name> (set)
//   note1, note2 ...
//
// note:<uuid> (hash)
//   ver (int)
//   nick (string)
//   timestamp (int)
//   msg (text)
//
// urls:<userid>:<nwid>:<channel_name> (list)
//   url1, url2 ...
//
// DRAFTS
//
// outbox:nnn (list)
//   msg1, msg2 ...
//
//

//
//