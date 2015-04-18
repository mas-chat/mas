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

const dropPriviledges = require('../../lib/dropPriviledges');

dropPriviledges.drop();

require('../../lib/init')('loopback');

const co = require('co'),
      redisModule = require('../../lib/redis'),
      conf = require('../../lib/conf'),
      courier = require('../../lib/courier').createEndPoint('loopbackparser'),
      masWindow = require('../../models/window'),
      nicks = require('../../models/nick'),
      conversationFactory = require('../../models/conversation');

co(function*() {
    yield redisModule.loadScripts();
    yield redisModule.initDB();
    yield createInitialGroups();

    courier.on('send', courier.noop);
    courier.on('textCommand', processTextCommand);
    courier.on('updateTopic', processUpdateTopic);
    courier.on('updatePassword', processUpdatePassword);
    courier.on('create', processCreate);
    courier.on('join', processJoin);
    courier.on('close', courier.noop); // TBD: Should we do something?
    courier.start();
})();

function processTextCommand() {
    return { status: 'ERROR', errorMsg: 'Unknown command in this context.' };
}

function *processCreate(params) {
    let userId = params.userId;
    let groupName = params.name;
    let password = params.password;

    if (!groupName) {
        return { status: 'ERROR_NAME_MISSING', errorMsg: 'Name can\'t be empty.' };
    }

    let conversation = yield conversationFactory.findGroup(groupName, 'MAS');

    if (conversation) {
        return {
            status: 'ERROR_EXISTS',
            errorMsg: 'A group by this name already exists. If you\'d like, you can try to join it.'
        };
    }

    // TBD Add other checks

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

    return { status: 'OK' };
}

function *processJoin(params) {
    let groupName = params.name;
    let userId = params.userId;
    let conversation = yield conversationFactory.findGroup(groupName, 'MAS');

    if (!conversation) {
        return { status: 'NOT_FOUND', errorMsg: 'Group doesn\'t exist.' };
    } else if (conversation.password !== '' && conversation.password !== params.password) {
        return { status: 'INCORRECT_PASSWORD', errorMsg: 'Incorrect password.' };
    }

    // Owner might have returned
    let role = conversation.owner === userId ? '*' : 'u';

    yield joinGroup(conversation, userId, role);

    return { status: 'OK' };
}

function *processUpdatePassword(params) {
    let conversation = yield conversationFactory.get(params.conversationId);
    yield conversation.setPassword(params.password);

    return { status: 'OK' };
}

function *processUpdateTopic(params) {
    let conversation = yield conversationFactory.get(params.conversationId);
    let nick = yield nicks.getCurrentNick(params.userId, conversation.network);

    yield conversation.setTopic(params.topic, nick);

    return { status: 'OK' };
}

function *joinGroup(conversation, userId, role) {
    yield masWindow.create(userId, conversation.conversationId);
    yield conversation.addGroupMember(userId, role);
    yield conversation.sendAddMembers(userId);
}

function *createInitialGroups() {
    let groups = conf.get('loopback:initial_groups').split(',');
    let admin = conf.get('common:admin') || 1;

    for (let group of groups) {
        let existingGroup = yield conversationFactory.findGroup(group, 'MAS');

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
