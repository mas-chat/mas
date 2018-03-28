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

const init = require('../../lib/init');

init.configureProcess('loopback');

const redis = require('../../lib/redis');
const conf = require('../../lib/conf');
const log = require('../../lib/log');
const courier = require('../../lib/courier').createEndPoint('loopbackparser');
const Conversation = require('../../models/conversation');
const User = require('../../models/user');
const windowsService = require('../../services/windows');
const nicksService = require('../../services/nicks');
const conversationsService = require('../../services/conversations');

init.on('beforeShutdown', async () => {
  await courier.quit();
});

init.on('afterShutdown', () => {
  redis.shutdown();
  log.quit();
});

start();

async function start() {
  await createInitialGroups();

  courier.on('send', processSend);
  courier.on('textCommand', processText);
  courier.on('updateTopic', processUpdateTopic);
  courier.on('updatePassword', processUpdatePassword);
  courier.on('create', processCreate);
  courier.on('join', processJoin);
  courier.on('close', courier.noop); // TODO: Should we do something?

  await courier.listen();
}

function processText() {
  return { status: 'ERROR', errorMsg: 'Unknown command in this context. Try /help' };
}

async function processSend({ userId, conversationId }) {
  const user = await User.fetch(userId);
  const conversation = await Conversation.fetch(conversationId);

  if (conversation.get('type') === '1on1') {
    const targetMember = await conversationsService.getPeerMember(conversation, user);
    const targetUser = await User.fetch(targetMember.id);
    const validUser = await userExists(targetUser);

    if (!validUser) {
      return {
        status: 'ERROR',
        errorMsg: "This MAS user's account is deleted. Please close this conversation."
      };
    }
  }

  return { status: 'OK' };
}

async function processCreate({ userId, name, password }) {
  const user = await User.fetch(userId);

  if (!name) {
    return { status: 'ERROR_NAME_MISSING', errorMsg: "Name can't be empty." };
  }

  // TBD Add other checks

  const conversation = await Conversation.create({
    owner: userId,
    type: 'group',
    name,
    network: 'mas',
    topic: 'Welcome!',
    password,
    apikey: ''
  });

  if (!conversation.valid) {
    // TODO: Don't assume ERROR_EXISTS is the only possible error
    return {
      status: 'ERROR_EXISTS',
      errorMsg: "A group by this name already exists. If you'd like, you can try to join it."
    };
  }

  await joinGroup(conversation, user, '*');

  return { status: 'OK' };
}

async function processJoin({ userId, name, password }) {
  const user = await User.fetch(userId);
  const conversation = await Conversation.findFirst({ type: 'group', network: 'mas', name });

  if (!conversation) {
    return { status: 'NOT_FOUND', errorMsg: "Group doesn't exist." };
  } else if (conversation.get('password') && conversation.get('password') !== password) {
    return { status: 'INCORRECT_PASSWORD', errorMsg: 'Incorrect password.' };
  }

  // Owner might have returned
  const role = conversation.get('owner') === user.gId ? '*' : 'u';

  await joinGroup(conversation, user, role);

  return { status: 'OK' };
}

async function processUpdatePassword({ conversationId, password }) {
  const conversation = await Conversation.fetch(conversationId);

  await conversationsService.setPassword(conversation, password);

  return { status: 'OK' };
}

async function processUpdateTopic({ userId, conversationId, topic }) {
  const conversation = await Conversation.fetch(conversationId);
  const user = await User.fetch(userId);
  const nick = await nicksService.getNick(user.gId, 'mas');

  await conversationsService.setTopic(conversation, topic, nick);

  return { status: 'OK' };
}

async function joinGroup(conversation, user, role) {
  await windowsService.create(user, conversation);
  await conversationsService.addGroupMember(conversation, user.gId, role);
  await conversationsService.sendFullAddMembers(conversation, user);
}

async function createInitialGroups() {
  const groups = conf.get('loopback:initial_groups').split(',');
  const adminUserId = parseInt(conf.get('common:admin'));

  for (const name of groups) {
    const existingGroup = await Conversation.findFirst({
      type: 'group',
      network: 'mas',
      name
    });

    if (!existingGroup) {
      await Conversation.create({
        owner: adminUserId,
        type: 'group',
        name,
        network: 'mas',
        topic: 'Welcome!',
        password: null
      });
    }
  }
}

function userExists(user) {
  return user && !user.get('deleted');
}
