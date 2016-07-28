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

const notification = require('../lib/notification'),
      alerts = require('../lib/alert'),
      courier = require('../lib/courier').create(),
      conf = require('../lib/conf'),
      friendsService = require('../services/friends'),
      settingsService = require('../services/settings'),
      Conversation = require('../models/conversation'),
      ConversationMember = require('../models/conversationMember'),
      ConversationMessage = require('../models/conversationMessage'),
      Window = require('../models/window');

const networks = [ 'MAS', ...Object.keys(conf.get('irc:networks')) ];

// TBD: Is courier quit() needed?

exports.init = async function(user, session, maxBacklogLines, cachedUpto) {
    await settingsService.sendSet(user, session.id);
    await friendsService.sendFriends(user, session.id);
    await friendsService.sendFriendConfirm(user, session.id);
    await friendsService.informStateChange(user, 'login');

    await alerts.sendAlerts(user, session.id);
    await sendNetworkList(user, session.id);

    const messages = [];
    const windows = await Window.find({ userId: user.id });

    for (const window of windows) {
        const conversationId = window.get('conversationId');
        const conversation = await Conversation.fetch(conversationId);
        const members = await ConversationMember.find({ conversationId });

        const role = members.find(member => member.get('userGId') === user.gIdString).get('role');
        let oneOnOneMember = undefined;

        if (conversation.get('type') === '1on1') {
            oneOnOneMember = members.find(member => member.get('userGId') !== user.gIdString);
        }

        messages.push({
            id: 'CREATE',
            windowId: window.id,
            name: conversation.get('name'),
            userId: oneOnOneMember && oneOnOneMember.get('userGId'),
            type: conversation.get('type'),
            network: conversation.get('network'),
            password: conversation.get('password'),
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
            role: role
        });

        messages.push({
            id: 'ADDMEMBERS',
            windowId: window.id,
            reset: true,
            members: members.map(member => ({
                userId: member.get('userGId'),
                role: member.get('role')
            }))
        });

        const lines = await ConversationMessage.find({ conversationId: conversation.id });
        const firstBacklogMessage = lines.length - maxBacklogLines;

        lines.forEach((message, index) => {
            const newMsg = index >= firstBacklogMessage && message.id > cachedUpto;
            const newEdit = message.get('status') !== 'original' &&
                message.get('updatedId') >= cachedUpto

            if (newMsg || newEdit) {
                const ntf = message.convertToNtf();
                ntf.windowId = window.id;

                messages.push(ntf);
            }
        });
    }

    messages.push({ id: 'INITDONE' });

    await notification.send(user, session.id, messages);

    // Check if the user was away too long
    courier.callNoWait('ircparser', 'reconnectifinactive', { userId: user.id });
};

async function sendNetworkList(userGId, sessionId) {
    await notification.send(userGId, sessionId, {
        id: 'NETWORKS',
        networks: networks
    });
}
