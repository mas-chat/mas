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

const assert = require('assert');
const Window = require('../models/window');
const Settings = require('../models/settings');
const Conversation = require('../models/conversation');
const ConversationMember = require('../models/conversationMember');
const ConversationMessage = require('../models/conversationMessage');
const notification = require('../lib/notification');
const log = require('../lib/log');
const conf = require('../lib/conf');

exports.findOrCreate = async function findOrCreate(user, conversation) {
    let window = await Window.findFirst({ userId: user.id, conversationId: conversation.id });

    if (!window) {
        window = await createWindow(user, conversation);
    }

    return window;
};

exports.create = async function create(user, conversation) {
    return await createWindow(user, conversation);
};

exports.findByConversation = async function findByConversation(user, conversation) {
    return await Window.findFirst({ userId: user.id, conversationId: conversation.id });
};

exports.isValidDesktop = async function isValidDesktop(user, desktop) {
    const windows = await Window.find({ userId: user.id });

    return windows.some(window => window.get('desktop') === desktop);
};

exports.getWindowsForNetwork = async function getWindowsForNetwork(user, network) {
    const windows = await Window.find({ userId: user.id });
    const matchingWindows = [];

    for (const window of windows) {
        const conversation = await Conversation.fetch(window.get('conversationId'));

        if (!conversation) {
            log.warn(user, `Conversation missing, id: ${conversation.id}`);
        } else if (conversation.get('network') === network) {
            matchingWindows.push(window);
        }
    }

    return matchingWindows;
};

async function createWindow(user, conversation) {
    let peerMember = null;

    assert(conversation);

    const settings = await Settings.findFirst({ userId: user.id });

    assert(settings, `User ${user.id} doesn't have settings.`);

    const window = await Window.create({
        userId: user.id,
        conversationId: conversation.id,
        desktop: settings.get('currentDesktop')
    });

    if (conversation.get('type') === '1on1') {
        const members = await ConversationMember.find({ conversationId: conversation.id });
        peerMember = members.find(member => member.get('userGId') !== user.gIdString);
    }

    // TODO: Copy paste code
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

    const maxBacklogLines = conf.get('session:max_backlog');
    const messages = await ConversationMessage.find({ conversationId: conversation.id });

    for (const message of messages.slice(-1 * maxBacklogLines)) {
        const ntf = message.convertToNtf();
        ntf.windowId = window.id;

        await notification.broadcast(user, ntf);
    }

    return window;
}
