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
      Window = require('../models/window'),
      Settings = require('../models/settings'),
      Conversation = require('../models/conversation'),
      ConversationMember = require('../models/ConversationMember'),
      User = require('../models/user'),
      notification = require('../lib/notification'),
      log = require('../lib/log'),
      conf = require('../lib/conf');

exports.create = async function(user, conversation) {
    return await create(user, conversation);
};

exports.remove = async function(user, windowId) {
    const windows = await Window.find({ userId: user.id });
    const window = windows.find(item => item.id == windowId);

    await remove(window);
};

exports.isValidDesktop = async function(user, desktop) {
    const windows = await Window.find({ userId: user.id });

    return windows.some(window => window.get('existingDesktop') === desktop);
};

exports.removeByConversation = async function(user, conversation) {
    const window = await Window.findFirst({ userId: user.id, conversationId: conversation.id });

    if (window) {
        await remove(window);
    }
};

exports.findByConversation = async function(user, conversation) {
    return await Window.findFirst({ userId: user.id, conversationId: conversation.id });
};

exports.getAllConversations = async function(user) {
    return await getAllConversations(user);
};

exports.getWindowsForNetwork = async function(user, network) {
    const windows = await Window.find({ userId: user.id });
    let matchingWindows = [];

    for (const window of windows) {
        let conversation = await Conversation.fetch(window.get('conversationId'));

        if (!conversation) {
            log.warn(user, `Conversation missing, id: ${conversation.id}`);
        } else if (conversation.get('network') === network) {
            matchingWindows.push(window);
        }
    }

    return matchingWindows;
};

exports.getNetworks = async function(user) {
    let conversations = await getAllConversations(user);
    let networks = {};

    for (let conversation of conversations) {
        networks[conversation.get('network')] = true;
    }

    return Object.keys(networks);
};

async function create(user, conversation) {
    let peerMember = undefined;

    assert(conversation);

    const settings = await Settings.findFirst({ userId: user.id });

    const window = await Window.create({
        userId: user.id,
        conversationId: conversation.id,
        desktop: settings.get('currentDesktop')
    });

    if (conversation.get('type') === '1on1') {
        const members = await ConversationMember.find({ conversationId: conversation.id });
        peerMember = members.find(member => member.get('userGId') !== user.gId);
    }

    await notification.broadcast(user, {
        id: 'CREATE',
        windowId: window.id,
        name: conversation.get('name'),
        userId: peerMember && peerMember.get('userGId'),
        type: conversation.get('type'),
        network: conversation.get('network'),
        password: conversation.get('password') || null,
        topic: conversation.get('topic'),
        alerts: {
            email: window.get('emailAlert'),
            notification: window.get('notificationAlert'),
            sound: window.get('soundAlert'),
            title: window.get('titleAlert')
        },
        row: window.get('row'),
        column: window.get('column'),
        minimizedNamesList: window.get('minimizedNamesList'),
        desktop: window.get('desktop'),
        role: 'u' // Everybody starts as a normal user
    });

    await sendBacklog(user, conversation, window);

    return window.id;
}

async function getAllConversations(user) {
    const windows = await Window.find({ userId: user.id });
    let conversations = [];

    for (const window of windows) {
        const conversation = await Conversation.fetch(window.get('conversationId'));
        conversations.push(conversation);
    }

    return conversations;
}

async function remove(window) {
    const user = await User.fetch(window.get('userId'));

    log.info(user, `Removing window, id: ${window.id}`);

    await notification.broadcast(user, {
        id: 'CLOSE',
        windowId: window.id
    });

    await window.remove();
}

async function sendBacklog(user, conversation, window) {
    let maxBacklogLines = conf.get('session:max_backlog');
    let lines = await redis.lrange(`conversationmsgs:${conversation.id}`, 0, maxBacklogLines - 1);

    if (!lines) {
        return;
    }

    for (let line of lines) {
        let message = JSON.parse(line);

        message.id = 'MSG';
        message.windowId = window.id;

        await notification.broadcast(user, message);
    }
}
