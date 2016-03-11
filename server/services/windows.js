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
      redis = require('../lib/redis').createClient(),
      notification = require('../lib/notification'),
      log = require('../lib/log'),
      conf = require('../lib/conf'),
      conversationFactory = require('./conversation');

exports.isValidDesktop = async function(userId, desktop) {



    let windows = await redis.smembers(`windowlist:${userId}`);
    let found = false;

    for (let windowId of windows) {
        // TBD: Too many redis calls, re-factor to lua later.
        let existingDesktop = await redis.hget(`window:${userId}:${windowId}`, 'desktop');

        if (existingDesktop && parseInt(existingDesktop) === desktop) {
            found = true;
            break;
        }
    }

    return found;
};

exports.removeByConversationId = async function(userId, conversationId) {
    let windows = await redis.smembers(`windowlist:${userId}`);

    for (let masWindow of windows) {
        let myConversationId = await getConversationId(userId, masWindow);

        if (myConversationId === conversationId) {
            await remove(userId, masWindow);
        }
    }
};

exports.findByConversationId = async function(userId, conversationId) {
    assert(conversationId);

    return await redis.hget('index:windowIds', userId + ':' + conversationId);
};

exports.getAllConversationIds = async function(userId) {
    return await getAllConversationIds(userId);
};

exports.getWindowIdsForNetwork = async function(userId, network) {
    let windows = await redis.smembers(`windowlist:${userId}`);
    let windowIds = [];

    for (let masWindow of windows) {
        let conversationId = await getConversationId(userId, masWindow);
        let conversation = await conversationFactory.get(conversationId);

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
    return await getConversationId(userId, windowId);
};

function *create(userId, conversationId) {
    if (conversation.type === '1on1') {
        let ids = Object.keys(conversation.members);
        userId1on1 = ids[0] === userId ? ids[1] : ids[0];
    }

    await redis.hset('index:windowIds', userId + ':' + conversationId, windowId);

    await notification.broadcast(userId, {
        id: 'CREATE',
        windowId: windowId,
        name: conversation.name,
        userId: userId1on1,
        type: conversation.type,
        network: conversation.network,
        password: conversation.password || null,
        topic: conversation.topic,
        alerts: {
            email: newWindow.emailAlert,
            notification: newWindow.notificationAlert,
            sound: newWindow.soundAlert,
            title: newWindow.titleAlert
        },
        row: newWindow.row,
        column: newWindow.column,
        minimizedNamesList: newWindow.minimizedNamesList,
        desktop: newWindow.desktop,
        role: 'u' // Everybody starts as a normal user
    });

    await sendBacklog(userId, conversationId, windowId);

    return windowId;
}

function *getAllConversationIds(userId) {
    let windows = await redis.smembers(`windowlist:${userId}`);
    let conversationIds = [];

    for (let masWindow of windows) {
        let conversationId = await getConversationId(userId, masWindow);
        conversationIds.push(conversationId);
    }

    return conversationIds;
}

function *getConversationId(userId, windowId) {
    return parseInt(await redis.hget(`window:${userId}:${windowId}`, 'conversationId'));
}

function *remove(userId, windowId) {
    let conversationId = await getConversationId(userId, windowId);

    log.info(userId, `Removing window, id: ${windowId}`);

    let deletedList = await redis.srem(`windowlist:${userId}`, windowId);
    let deletedIndex = await redis.hdel('index:windowIds', userId + ':' + conversationId);
    let deletedWindow = await redis.del(`window:${userId}:${windowId}`);

    // TBD: Convert to assert when the situation are fully stable
    if (deletedList === 0) {
        log.warn(userId, 'windowlist entry missing.');
    } else if (deletedIndex === 0) {
        log.warn(userId, 'index:windowIds entry missing.');
    } else if (deletedWindow === 0) {
        log.warn(userId, 'window entry missing.');
    }

    await notification.broadcast(userId, {
        id: 'CLOSE',
        windowId: parseInt(windowId)
    });
}

function *sendBacklog(userId, conversationId, windowId) {
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
