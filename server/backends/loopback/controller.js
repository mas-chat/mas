#!/usr/bin/env node
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
    courier = require('../../lib/courier').createEndPoint('loopbackparser'),
    outbox = require('../../lib/outbox'),
    window = require('../../models/window'),
    nicks = require('../../models/nick'),
    conversationFactory = require('../../models/conversation');

co(function*() {
    yield redisModule.loadScripts();
    yield redisModule.initDB();
    yield createInitialGroups();

    courier.on('send', courier.noop);
    courier.on('texCommand', courier.noop);
    courier.on('chat', courier.noop);
    courier.on('updateTopic', processUpdateTopic);
    courier.on('updatePassword', processUpdatePassword);
    courier.on('create', processCreate);
    courier.on('join', processJoin);
    courier.on('close', courier.noop); // TBD: Should we do something?
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

function *processUpdatePassword(params) {
    var conversation = yield conversationFactory.get(params.conversationId);

    yield conversation.setPassword(params.password);
}

function *processUpdateTopic(params) {
    var conversation = yield conversationFactory.get(params.conversationId);
    var nick = yield nicks.getCurrentNick(params.userId, conversation.network);

    yield conversation.setTopic(params.topic, nick);

    yield outbox.queue(params.userId, params.sessionId, {
        id: 'UPDATE_TOPIC_RESP',
        status: 'OK'
    });
}

function *joinGroup(conversation, userId, role) {
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
