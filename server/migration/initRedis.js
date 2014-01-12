#!/usr/bin/env node
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

'use strict';

var r = require('redis').createClient(),
    uuid = require('node-uuid'),
    nconf = require('nconf').file('../config.json'),
    Q = require('q'),
    co = require('co');

var mysql = require('mysql').createConnection({
    host: 'localhost',
    user: nconf.get('dbUsername'),
    password: nconf.get('dbPassword'),
    database: 'milhouse'
});

r.on('error', function (err) {
    console.log('Error: ' + err);
    process.exit(1);
});

co(function *() {
    yield importUsers;
    console.log('All users imported.');

    yield importWindows;
    console.log('All windows imported.');

    process.exit(0);
})();

function notEmpty(v) {
   return v !== '';
}

function *importUsers() {
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

    // Delete existing data from Redis database
    yield Q.nsend(r, 'flushdb');
    console.log('Flush done.');

    var ret = yield Q.nsend(mysql, 'query', 'SELECT ' + userColumns.join() + ' FROM users');
    var rows = ret[0];

    console.log('Processing ' + rows.length + ' users.');

    for (var i = 0; i < rows.length && i < 10; i++) {
        var row = rows[i];

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
        var friends = row.friends.split(':').filter(notEmpty);
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

        var index = {};
        index[row.nick] = row.userid,
        index[row.email] = row.userid

        var promises = [
            Q.nsend(r, 'hmset', 'user:' + row.userid, row),
            Q.nsend(r, 'hmset', 'index:user', index),
            Q.nsend(r, 'sadd', 'userlist', row.userid),
            Q.nsend(r, 'hmset', 'settings:' + row.userid, settings)
        ];

        if (friends.length > 0) {
            promises.push(Q.nsend(r, 'sadd', 'friends:' + row.userid, friends));
        }

        yield promises;
    }
}

// Windows
function *importWindows() {
    var ret = yield Q.nsend(mysql, 'query', 'SELECT * FROM channels');
    var rows = ret[0];

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        // Take friends list out
        var notes = row.notes.split('<>').filter(notEmpty);

        // Take urls out
        var urls = row.urls.split('<>').filter(notEmpty);

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
            var note = {};
            var noteUuid = uuid.v4();
            note.ver = 0;
            note.msg = notes[ii];

            yield Q.nsend(r, 'hmset', 'note:' + noteUuid, note);
            yield Q.nsend(r, 'sadd', 'notelist:' + userid + ':' + network + ':' +
                name, noteUuid);
        }

        // Save urls
        for (ii = 0; ii < urls.length; ii++) {
            yield Q.nsend(r, 'sadd', 'urls:' + userid + ':' +
                network + ':' + name, urls[ii]);
        }

        // Get the next window id.
        var windowid = yield Q.nsend(r, 'hincrby', 'user:' + userid, 'nextwindowid', 1);
        windowid--;

        yield Q.nsend(r, 'hmset', 'window:' + userid + ':' + windowid, row);
        yield Q.nsend(r, 'sadd', 'windowlist:' + userid, windowid + ':' + network + ':' + name);
    }
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
//       index:user (hash)
//         <email> (string)
//         <nick> (string)
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
// [TBD] windowmsgs:<userid>:<id> (list)
//
// [TBD] names:<userid>:<id> (set)
//   nick1, @nick2
//
// [TBD] inbox:<userid> (list)
//   msg:<windowid>
//   names:<windowid>
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
