#!/usr/bin/env node
//
//   Copyright 2015 Ilkka Oksanen <iao@iki.fi>
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

const ObjectStore = require('rigiddb');
const co = require('co');
const crypto = require('crypto');
const Redis = require('ioredis');

require('console.table');

let store = new ObjectStore('mas', { db: 10 });
let redis = new Redis();
let redis10 = new Redis({ db: 10 });

let all = [];
let users = {};

function *migrateUsers() {
    let userIds = yield redis.keys('user:*');

    userIds = userIds.map(userId => parseInt(userId.substring(6))).sort((a,b) => a - b);

    let prev = false;

    for (let userId of userIds) {
        if (userId === prev) {
            throw 'Duplicate userId found.'
        }

        yield redis10.set('mas:users:nextid', userId - 1);

        prev = userId;

        let details = yield redis.hgetall(`user:m${userId}`);

        if (details.email === 'kernel36@yahoo.com' ||
            details.email === 'davlom30@yahoo.com' ||
            details.email === 'ilkkaoks@yahoo.com' ||
            details.email === 'clement.begue@gmail.com') {
            continue;
        }

        details = rename(details, {
            inuse: 'inUse',
            lastlogout: 'lastLogout',
            lastip: 'lastIp',
            openidurl: 'extAuthId',
            registrationtime: 'registrationTime',
            nextwindowid: 'nextWindowId'
        });

        if (details.userId === 5336) {
            details.nick = details.nick + '2';
        }

        if (details.nick === 'nyytix') {
            details.email = 'nyytinen+1@gmail.com';
        }

        if (details.nick === 'rhardih') {
            details.email = 'renehh+1@gmail.com';
        }

        if (details.nick === 'TeemuL') {
            details.email = 'Teemu.Sikanauta+1@gmail.com';
        }

        if (details.nick === 'TonyMate') {
            details.email = 'toni.barman+1@gmail.com';
        }

        if (details.nick === 'Tykki_') {
            details.email = 'ylikuha+1@gmail.com';
        }

        if (details.nick === 'Pentsi') {
            details.email = 'pentsi79+1@gmail.com';
        }

        if (details.nick === 'zakius') {
            details.email = 'zakius.rolkash+1@gmail.com';
        }

        if (/^sha256:\0+$/.test(details.password)) {
            details.password = null;
            details.passwordType = null;
        }

        details.emailConfirmed = details.emailConfirmed === 'true' ? true : false;
        details.inUse = details.inUse === 'true';
        details.deleted = details.deleted === 'true';

        if (details.lastLogout === undefined) {
            details.deleted = true;
        }

        if (details.deleted) {
            details.deletedEmail = details.email;
            details.email = null;
            details.emailMD5 = null;
            details.secret = null;

            details.secretExpires = null;
            details.deletionTime = parseDate(details.deletionTime) || new Date();
        } else {
            users[userId] = true;

            details.emailMD5 = crypto.createHash('md5').update(details.email).digest("hex");
            details.secretExpires = parseDate(details.secretExpires);
            details.deletedEmail = null;
            details.deletionTime = null;
        }

        details.lastLogout = details.lastLogout === '0' ? null : parseDate(details.lastLogout);
        details.registrationTime = parseDate(details.registrationTime || "0");

        details.extAuthId = details.extAuthId || null;

        const [ pwType, pw ] = details.password ? details.password.split(':') : [];
        details.password = pw || null;
        details.passwordType = pwType || null;

        details.lastIp = details.lastIp || null;

        delete details.userId;
        delete details.nextWindowId;
        delete details.lastlogin

        let result = yield store.create('users', details);

        if (result.val === false) {
            console.log(result);
            console.log(details);
        }

        all.push(details);
    }

    console.log(`${Object.keys(users).length} users imported.`);

//    yield store.debugPrint('users');
}

function *migrateWindows() {
    let windows = yield redis.keys('window:*');

    for (let win of windows) {
        let redisWin = yield redis.hgetall(win);

        let userId = parseInt(win.split(':')[1].substring(1))

        if (!users[userId]) {
            continue;
        }

        redisWin.userId = userId;
        redisWin.conversationId = parseInt(redisWin.conversationId);
        redisWin.emailAlert = redisWin.emailAlert === 'true';
        redisWin.notificationAlert = redisWin.notificationAlert === 'true';
        redisWin.soundAlert = redisWin.soundAlert === 'true';
        redisWin.titleAlert = redisWin.titleAlert === 'true';
        redisWin.minimizedNamesList = redisWin.minimizedNamesList === 'true';
        redisWin.desktop = parseInt(redisWin.desktop);
        redisWin.row = parseInt(redisWin.row);
        redisWin.column = parseInt(redisWin.column);

        let result = yield store.create('windows', redisWin);

        if (result.val === false) {
            console.log(result);
            console.log(redisWin);
        }
    }

//    yield store.debugPrint('windows');
}

function *migrateFriends() {
    let friendsKeys = yield redis.keys('friends:*');
    yield addFriendRelationships(friendsKeys, 'active');

    friendsKeys = yield redis.keys('friendsrequests:*');
    yield addFriendRelationships(friendsKeys, 'pending');

//    yield store.debugPrint('friends');
}

function *addFriendRelationships(friendsKeys, status) {
    for (let friendKey of friendsKeys) {
        let userId = parseInt(friendKey.split(':')[1].substring(1));

        if (!users[userId]) {
            continue;
        }

        let friends = yield redis.smembers(friendKey);

        for (let friendId of friends) {
            const srcUserId = userId;
            const dstUserId = parseInt(friendId.substring(1));

            if (!users[dstUserId]) {
                continue;
            }

            const { val } = yield store.find('friends', {
                srcUserId: dstUserId,
                dstUserId: srcUserId,
            });

            if (val && val.length !== 0) {
                continue;
            }

            let result = yield store.create('friends', {
                srcUserId: srcUserId,
                dstUserId: dstUserId,
                state: status
            });

            if (result.val === false) {
                console.log(result);
                console.log(friend);
            }
        }
    }
}

function *migrateSettings() {
    let settings = yield redis.keys('settings:*');

    let foo = {}

    for (let set of settings) {
        let redisSet = yield redis.hgetall(set);
        let userId = parseInt(set.split(':')[1].substring(1));

        if (!users[userId]) {
            continue;
        }

        let result = yield store.create('settings', {
            userId: userId,
            activeDesktop: redisSet.activeDesktop || 0,
            theme: redisSet.theme || 'default'
        });

        if (result.val === false) {
            console.log(result);
            console.log(set);
        }
    }

//    yield store.debugPrint('settings');
}

co(function*() {
    yield migrateUsers();
    yield migrateWindows();
    yield migrateSettings();
    yield migrateFriends();

    redis.quit();
    redis10.quit();
    store.quit();

    console.log('Done.')
})();


function rename(obj, renameTable) {
    for (let prop in renameTable) {
        if (obj[prop]) {
            obj[renameTable[prop]] = obj[prop];
            delete obj[prop];
        }
    }

    return obj;
}

function parseDate(date) {
    if (!date) {
        return new Date(0);
    } else {
        const numericDate = parseInt(date) * 1000;
        let newDate = new Date(numericDate);

        if (isNaN(newDate.getTime())) {
            console.log('INSERTING INVALID DATE!!!');
        }

        return newDate;
    }
}

