#!/usr/bin/env node --harmony
//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
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

process.title = 'mas-loopback';
process.umask(18); // file: rw-r--r-- directory: rwxr-xr-x

var co = require('co'),
    npid = require('npid'),
    log = require('../../lib/log'),
    redisModule = require('../../lib/redis'),
    redis = redisModule.createClient(),
    courier = require('../../lib/courier').createEndPoint('loopbackparser'),
    textLine = require('../../lib/textLine'),
    outbox = require('../../lib/outbox'),
    conf = require('../../lib/conf');

npid.create(conf.get('pid:directory') + '/' + process.title + '.pid');

log.info('Starting: ' + process.title);

co(function *() {
    yield redisModule.loadScripts();

    courier.on('send', processSend);
    courier.on('create', processCreate);
    courier.start();
})();

// Upper layer messages

// addText
function *processSend(params) {
    var group = params.name;
    var members = yield redis.smembers('group:' + group);
    var nick = yield redis.hget('user:' + params.userId, 'nick');

    for (var i = 0; i < members.length; i++) {
        if (members[i] !== params.userId) {
            yield textLine.send(members[i], 'MAS', group, {
                nick: nick,
                cat: 'msg',
                body: params.text,
                ts: Math.round(Date.now() / 1000)
            });
        }
    }
}

function *processCreate(params) {
    var userId = params.userId;
    var groupName = params.name;
    var windowId = yield redis.hincrby('user:' + userId, 'nextwindowid', 1);

    // TBD: Check that group doesn't exist
    yield redis.sadd('group:' + groupName, userId);

    log.info(userId, 'Created new MAS group:' + groupName);

    // TBD Use windowhelper
    var windowDetails = {};
    //     name: groupName,
    //     type: 'group',
    //     sounds: 0,
    //     password: '',
    //     titleAlert: 1,
    //     visible: 1,
    //     topic: '',
    //     userMode: 2, // TBD: Check and fix
    //     newMsgs: 0 // TBD: Check and fix
    // };

    yield redis.hmset('window:' + userId + ':' + windowId, windowDetails);
    yield redis.sadd('windowlist:' + userId, windowId + ':MAS:' + groupName);

    windowDetails.id = 'CREATE';
    windowDetails.windowId = parseInt(windowId);
    windowDetails.network = 'MAS';

    yield outbox.queue(userId, true, windowDetails);
}

// function *processJoin(params) {
// });
