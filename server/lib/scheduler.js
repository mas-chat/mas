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

const cron = require('node-cron');
const mailer = require('./mailer');
import UserGId from './userGId';
const User = require('../models/user');
const MissedMessage = require('../models/missedMessage');
const Conversation = require('../models/conversation');
const nicksService = require('../services/nicks');
const conversationsService = require('../services/conversations');

const jobs = [];

exports.init = function init() {
  jobs.push(cron.schedule('*/5 * * * *', deliverEmails)); // Once in 5 minutes
};

exports.quit = function quit() {
  jobs.forEach(job => job.destroy());
};

// Sends email notifications to offline users
async function deliverEmails() {
  const missedMessages = await MissedMessage.fetchAll();
  const missedPerUser = groupBy(missedMessages, 'userId');

  for (const userId of Object.keys(missedPerUser)) {
    const user = await User.fetch(parseInt(userId));
    const missedPerConversations = groupBy(missedPerUser[userId], 'conversationId');
    const formattedMessages = await processUserMissedMessages(missedPerConversations, user);

    // TODO: Better would be to clear pending notifications during login
    if (!(await user.isOnline()) && Object.keys(formattedMessages).length > 0) {
      mailer.send(
        'emails/build/mentioned.hbs',
        {
          name: user.get('name'),
          messages: formattedMessages
        },
        user.get('email'),
        'You were just mentioned on MeetAndSpeak'
      );
    }
  }
}

async function processUserMissedMessages(missedPerConversations, user) {
  const twoMinutesAgo = new Date(Date.now() - 1000 * 60 * 2);
  const formattedMessages = {};

  for (const conversationId of Object.keys(missedPerConversations)) {
    // Notification are sorted by ts in the db, therefore the first one is the oldest
    if (missedPerConversations[conversationId][0].get('msgTs') > twoMinutesAgo) {
      // Wait for the next job execution
      continue;
    }

    const conversation = await Conversation.fetch(parseInt(conversationId));
    const name = await getName(conversation, user);

    formattedMessages[name] = [];

    for (const message of missedPerConversations[conversationId]) {
      const userGId = UserGId.create(message.get('msgUserGId'));
      const nick = await nicksService.getNick(userGId, conversation.get('network'));

      formattedMessages[name].push({ nick, body: message.get('msgBody') });
    }

    missedPerConversations[conversationId].forEach(message => message.delete());
  }

  return formattedMessages;
}

async function getName(conversation, user) {
  if (conversation.get('type') === 'group') {
    return `Group ${conversation.get('name')}`;
  }

  const peerMember = await conversationsService.getPeerMember(conversation, user.gId);
  const nick = await nicksService.getNick(peerMember.gId, conversation.get('network'));

  return `1on1 with ${nick}`;
}

function groupBy(array, groupByProperty) {
  const result = {};

  array.forEach(item => {
    const key = item.get(groupByProperty);

    result[key] = result[key] || [];
    result[key].push(item);
  });

  return result;
}
