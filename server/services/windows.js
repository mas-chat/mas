//
//   Copyright 2014 Ilkka Oksanen <iao@iki.fi>
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

const assert = require('assert'),
      Window = require('../models/window'),
      Settings = require('../models/settings'),
      notification = require('../lib/notification'),
      log = require('../lib/log'),
      conf = require('../lib/conf'),
      conversationFactory = require('../models/conversation');


exports.create = async function(userId, conversationId) {
    return await create(userId, conversationId);
};

exports.remove = async function(userId, windowId) {
    const windowRecords = await Window.find(userId, 'userId');
    const windowRecord = windowRecords.find(item => item.id == windowId);

    await remove(windowRecord);
};

exports.isValidDesktop = async function(userId, desktop) {
    const windowRecords = await Window.find(userId, 'userId');

    return windowRecords.some(item => item.get('existingDesktop') === desktop);
};

exports.removeByConversationId = async function(userId, conversationId) {
    const windowRecords = await Window.find(userId, 'userId');

    const toBeDeleted = windowRecords.filter(item => item.get('conversationId') === conversationId)

    for (const windowRecord of toBeDeleted) {
        await remove(windowRecord);
    }
};

exports.findByConversationId = async function(userId, conversationId) {
    assert(conversationId);

    const windowRecords = await Window.find(userId, 'userId');

    return windowRecords.find(item => item.get('conversationId') === conversationId);
};

exports.getAllConversationIds = async function(userId) {
    return await getAllConversationIds(userId);
};

exports.getWindowIdsForNetwork = async function(userId, network) {
    const windowRecords = await Window.find(userId, 'userId');
    let windowIds = [];

    for (const windowRecord of windowRecords) {
        let conversation = await conversationFactory.get(windowRecord.conversationId);

        if (!conversation) {
            log.warn(userId, `Conversation missing, id: ${conversationId}`);
        } else if (conversation.network === network) {
            windowIds.push(masWindow);
        }
    }

    return windowIds;
};

exports.getNetworks = async function(userId) {
    let conversationIds = await getAllConversationIds(userId);
    let networks = {};
    let res = [];

    for (let conversationId of conversationIds) {
        let conversation = await conversationFactory.get(conversationId);
        networks[conversation.network] = true;
    }

    Object.keys(networks).forEach(function(key) {
        res.push(key);
    });

    return res;
};

exports.getConversationId = async function(userId, windowId) {
    const windowRecord = await Window.fetch(windowId);

    return windowRecord.get('conversationId');
};

async function create(userId, conversationId) {
    let conversation = await conversationFactory.get(conversationId);
    let userId1on1 = null;

    assert(conversation);

    const settingsRecord = await Settings.findFirst(userId, 'userId');

    console.log('ok')

    const windowRecord = await Window.create({
        userId: userId,
        conversationId: conversationId,
        desktop: settingsRecord.get('currentDesktop')
    });

        console.log('c')

    if (conversation.type === '1on1') {
        let ids = Object.keys(conversation.members);
        userId1on1 = ids[0] === userId ? ids[1] : ids[0];
    }

        console.log('d')

    await notification.broadcast(userId, {
        id: 'CREATE',
        windowId: windowRecord.id,
        name: conversation.name,
        userId: userId1on1,
        type: conversation.type,
        network: conversation.network,
        password: conversation.password || null,
        topic: conversation.topic,
        alerts: {
            email: windowRecord.get('emailAlert'),
            notification: windowRecord.get('notificationAlert'),
            sound: windowRecord.get('soundAlert'),
            title: windowRecord.get('titleAlert')
        },
        row: windowRecord.get('row'),
        column: windowRecord.get('column'),
        minimizedNamesList: windowRecord.get('minimizedNamesList'),
        desktop: windowRecord.get('desktop'),
        role: 'u' // Everybody starts as a normal user
    });

    console.log('e')

    await sendBacklog(userId, conversationId, windowRecord.id);

    return windowRecord.id;
}

async function getAllConversationIds(userId) {
    const windowRecords = await Window.find(userId, 'userId');
    let conversationIds = [];

    for (const windowRecord of windowRecords) {
        conversationIds.push(windowRecord.get('conversationId'));
    }

    return conversationIds;
}

async function remove(windowRecord) {
    const userId = windowRecord.get('userId');

    log.info(userId, `Removing window, id: ${windowRecord.id}`);

    await notification.broadcast(userId, {
        id: 'CLOSE',
        windowId: windowRecord.id
    });
}

async function sendBacklog(userId, conversationId, windowId) {
    // TBD: This is similar code as in initSession.lua
    let maxBacklogLines = conf.get('session:max_backlog');
    let lines = await redis.lrange(`conversationmsgs:${conversationId}`, 0, maxBacklogLines - 1);

    if (!lines) {
        return;
    }

    for (let line of lines) {
        let message = JSON.parse(line);

        message.id = 'MSG';
        message.windowId = windowId;

        await notification.broadcast(userId, message);
    }
}
