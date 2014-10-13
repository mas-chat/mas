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

require('../../lib/init')('loopback');

var co = require('co'),
    log = require('../../lib/log'),
    redisModule = require('../../lib/redis'),
    conf = require('../../lib/conf'),
    redis = redisModule.createClient(),
    courier = require('../../lib/courier').createEndPoint('loopbackparser'),
    textLine = require('../../lib/textLine'),
    windowHelper = require('../../lib/windows'),
    outbox = require('../../lib/outbox');

co(function *() {
    yield redisModule.loadScripts();
    yield createInitialGroups();

    courier.on('send', processSend);
    courier.on('create', processCreate);
    courier.on('join', processJoin);
    courier.on('close', processClose);
    courier.start();
})();

function *processSend(params) {
    var name = params.name;

    if (!name) {
        // 1on1 message
        yield textLine.sendFromUserId(params.userId, params.targetUserId, {
            userId: params.userId,
            cat: 'msg',
            body: params.text
        });
    } else {
        var members = yield redis.smembers('groupmembers:' + name);

        for (var i = 0; i < members.length; i++) {
            if (members[i] !== params.userId) {
                var windowId = yield windowHelper.getGroupWindowId(members[i], 'MAS', name);

                yield textLine.send(members[i], windowId, {
                    userId: params.userId,
                    cat: 'msg',
                    body: params.text
                });
            }
        }
    }
}

function *processCreate(params) {
    var userId = params.userId;
    var groupName = params.name;
    var password = params.password;
    var existingGroup = yield redis.hgetall('group:' + groupName);

    if (existingGroup) {
        yield outbox.queue(params.userId, params.sessionId, {
            id: 'CREATE_RESP',
            status: 'error',
            errorMsg: 'A group by this name already exists. If you\'d like, you can try to join it.'
        });
        return;
    }

    // TBD Add other checks

    yield outbox.queue(params.userId, params.sessionId, {
        id: 'CREATE_RESP',
        status: 'OK'
    });

    yield redis.hmset('group:' + groupName, {
        owner: userId,
        password: password,
        apikey: ''
    });

    log.info(userId, 'Created new MAS group:' + groupName);

    yield joinGroup(params);
}

 function *processJoin(params) {
    yield outbox.queue(params.userId, params.sessionId, {
        id: 'JOIN_RESP',
        status: 'OK'
    });

    yield joinGroup(params);
 }

 function *processClose(params) {
    params = params;
    /* jshint noyield:true */
    // TBD
 }

function *joinGroup(params) {
    var groupName = params.name;
    var createCommand = yield windowHelper.createNewWindow(params.userId, 'MAS',
        groupName, params.password, 'group');

    yield outbox.queueAll(params.userId, createCommand);
    yield redis.sadd('groupmembers:' + groupName, params.userId);
}

function *createInitialGroups() {
    var groups = conf.get('loopback:initial_groups').split(',');
    var admin = conf.get('common:admin') || 1;

    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var exists = yield redis.exists('group:' + group);

        if (!exists) {
            log.info('Creating predefined group: ' + group);
            yield redis.hmset('group:' + group, {
                owner: admin,
                password: '',
                apikey: ''
            });
        }
    }
}
