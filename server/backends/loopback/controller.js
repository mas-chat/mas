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

/*jshint -W079 */

require('../../lib/init')('loopback');

var co = require('co'),
    redisModule = require('../../lib/redis'),
    conf = require('../../lib/conf'),
    redis = redisModule.createClient(),
    courier = require('../../lib/courier').createEndPoint('loopbackparser'),
    outbox = require('../../lib/outbox'),
    window = require('../../models/window'),
    nicks = require('../../models/nick'),
    conversationFactory = require('../../models/conversation');

co(function*() {
    yield redisModule.loadScripts();
    yield createInitialGroups();

    courier.on('send', courier.noop);
    courier.on('chat', courier.noop);
    courier.on('updateTopic', courier.noop);
    courier.on('updatePassword', courier.noop);
    courier.on('create', processCreate);
    courier.on('join', processJoin);
    courier.on('close', processClose);
    courier.start();
})();

function *processCreate(params) {
    var userId = params.userId;
    var groupName = params.name;
    var password = params.password;
    var conversation = yield conversationFactory.findGroup(groupName, 'MAS');

    if (conversation) {
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

    conversation = yield conversationFactory.create({
        owner: userId,
        type: 'group',
        name: groupName,
        network: 'MAS',
        topic: 'Welcome!',
        password: password,
        apikey: ''
    });

    yield joinGroup(conversation, userId, '*');
}

function *processJoin(params) {
    var groupName = params.name;
    var userId = params.userId;
    var conversation = yield conversationFactory.findGroup(groupName, 'MAS');
    var role = 'u';

    if (!conversation) {
        yield outbox.queue(userId, params.sessionId, {
            id: 'JOIN_RESP',
            status: 'NOT_FOUND',
            errorMsg: 'Group doesn\'t exist.'
        });
        return;
    } else if (conversation.password !== '' &&
        conversation.password !== params.password) {

        yield outbox.queue(userId, params.sessionId, {
            id: 'JOIN_RESP',
            status: 'INCORRECT_PASSWORD',
            errorMsg: 'Incorrect password.'
        });
        return;
    }

    yield outbox.queue(userId, params.sessionId, {
        id: 'JOIN_RESP',
        status: 'OK'
    });

    if (conversation.owner === userId) {
        // Owner returned
        role = '*';
    }

    yield joinGroup(conversation, userId, role);
}

function *processClose(params) {
    params = params;
    /* jshint noyield:true */
    // TBD
}

function *joinGroup(conversation, userId, role) {
    // Backends must maintain currentNick value
    var nick = yield redis.hget('user:' + userId, 'nick');
    yield nicks.updateCurrentNick(userId, 'MAS', nick);

    yield window.create(userId, conversation.conversationId);
    yield conversation.addGroupMember(userId, role);
    yield conversation.sendAddMembers(userId);
}

function *createInitialGroups() {
    var groups = conf.get('loopback:initial_groups').split(',');
    var admin = conf.get('common:admin') || 1;

    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var existingGroup = yield conversationFactory.findGroup(group, 'MAS');

        if (!existingGroup) {
            yield conversationFactory.create({
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
