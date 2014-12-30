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
    redisModule = require('../../lib/redis'),
    conversation = require('../../lib/conversation'),
    conf = require('../../lib/conf'),
    redis = redisModule.createClient(),
    courier = require('../../lib/courier').createEndPoint('loopbackparser'),
    window = require('../../lib/window'),
    outbox = require('../../lib/outbox');

co(function*() {
    yield redisModule.loadScripts();
    yield createInitialGroups();

    courier.on('send', courier.noop);
    courier.on('create', processCreate);
    courier.on('join', processJoin);
    courier.on('close', processClose);
    courier.start();
})();

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

    yield conversation.create({
        owner: userId,
        type: 'group',
        name: groupName,
        network: 'MAS',
        topic: 'Welcome!',
        password: password,
        apikey: ''
    });

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
    var userId = params.userId;
    var conversationId = yield conversation.findGroup(groupName, 'MAS');

    if (!conversationId) {
        // TBD: Bail out
        return;
    }

    yield conversation.addGroupMember(conversationId, userId, 'USER');

    var windowId = yield window.create(params.userId, conversationId);
    yield conversation.sendAddMembers(params.userId, windowId, conversationId);
}

function *createInitialGroups() {
    var groups = conf.get('loopback:initial_groups').split(',');
    var admin = conf.get('common:admin') || 1;

    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var existingGroup = yield conversation.findGroup(group, 'MAS');

        if (!existingGroup) {
            yield conversation.create({
                owner: admin,
                type: 'group',
                name: group,
                network: 'MAS',
                topic: 'Welcome!',
                password: '',
                apikey: ''
            });
        }
    }
}
