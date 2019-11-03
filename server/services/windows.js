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
const notification = require('../lib/notification');
import UserGId from '../lib/userGId';
const log = require('../lib/log');
const conf = require('../lib/conf');
const User = require('../models/user');
const Window = require('../models/window');
const Settings = require('../models/settings');
const Conversation = require('../models/conversation');
const ConversationMember = require('../models/conversationMember');
const ConversationMessage = require('../models/conversationMessage');
const MissedMessage = require('../models/missedMessage');
const nicksService = require('../services/nicks');
const conversaionsService = require('../services/conversations');

exports.findOrCreate = async function findOrCreate(user, conversation) {
  let window = await Window.findFirst({ userId: user.id, conversationId: conversation.id });

  if (!window) {
    window = await createWindow(user, conversation);
  }

  return window;
};

exports.create = async function create(user, conversation) {
  return createWindow(user, conversation);
};

exports.remove = async function remove(user, conversation) {
  const window = await Window.findFirst({ userId: user.id, conversationId: conversation.id });

  if (window) {
    log.info(user, `Removing window, id: ${window.id}`);

    await notification.broadcast(user, {
      type: 'DELETE_WINDOW',
      windowId: window.id
    });

    await window.delete();
  }
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

exports.scanMentions = async function scanMentions(conversation, message) {
  if (!message.get('userGId') || message.get('userGId') === 'i0' || !message.get('body')) {
    return;
  }

  const users = [];
  const srcUserGId = UserGId.create(message.get('userGId'));
  const network = conversation.get('network');

  if (conversation.get('type') === 'group') {
    const mentions = message.get('body').match(/(?:^| )@\S+(?=$| )/g);

    if (!mentions) {
      return;
    }

    for (const mention of mentions) {
      const user = await nicksService.getUser(mention.substring(1), network);

      if (user) {
        users.push(user);
      }
    }

    if (users.length === 0) {
      return;
    }
  } else {
    const peerMember = await conversaionsService.getPeerMember(conversation, srcUserGId);
    const peerMemberGId = UserGId.create(peerMember.get('userGId'));

    if (peerMemberGId.isMASUser) {
      const user = await User.fetch(peerMemberGId.id);

      if (user) {
        users.push(user);
      }
    }
  }

  for (const user of users) {
    if (user.get('deleted')) {
      continue;
    }

    const online = await user.isOnline();

    if (online) {
      continue; // Mentioned user is online
    }

    const window = await Window.findFirst({ userId: user.id, conversationId: conversation.id });

    if (window && window.get('emailAlert')) {
      await MissedMessage.create({
        userId: user.id,
        conversationId: conversation.id,
        msgUserGId: message.get('userGId'),
        msgBody: message.get('body'),
        msgTs: new Date()
      });
    }
  }
};

async function createWindow(user, conversation) {
  let peerMember = null;

  assert(conversation);

  let settings = await Settings.findFirst({ userId: user.id });

  if (!settings) {
    log.warn(user, "User doesn't have settings. Fixing.");
    settings = await Settings.create({ userId: user.id });
  }

  const window = await Window.create({
    userId: user.id,
    conversationId: conversation.id,
    desktop: settings.get('activeDesktop')
  });

  if (conversation.get('type') === '1on1') {
    const members = await ConversationMember.find({ conversationId: conversation.id });
    peerMember = members.find(member => member.get('userGId') !== user.gIdString);
  }

  // TODO: Copy paste code
  await notification.broadcast(user, {
    type: 'ADD_WINDOW',
    windowId: window.id,
    name: conversation.get('name'),
    userId: peerMember && peerMember.get('userGId'),
    windowType: conversation.get('type'),
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
    ntf.type = 'ADD_MESSAGE';
    ntf.windowId = window.id;

    await notification.broadcast(user, ntf);
  }

  return window;
}
