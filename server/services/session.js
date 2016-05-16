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

const redis = require('../lib/redis').createClient(),
      notification = require('../lib/notification'),
      Conversation = require('../models/conversation'),
      ConversationMember = require('../models/conversationMember'),
      Window = require('../models/window');

exports.init = async function(user, sessionId, maxBacklogLines, cachedUpto, ts) {
    const messages = [];
    const seenUserIds = {};
    const windows = await Window.find({ userId: user.id });

    await redis.zadd(`sessionlist:${user.gId}`, ts, sessionId);

    for (const window of windows) {
        const conversationId = window.get('conversationId');
        const conversation = await Conversation.fetch(conversationId);
        const members = await ConversationMember.find({ conversationId });
        const role = members.find(member => member.get('userId') === user.gId).get('role');
        let oneOnOneMember = undefined;

        if (conversation.get('type') === '1on1') {
            oneOnOneMember = members.find(member => member.get('userId') !== user.gId);
        }

        members.forEach(member => seenUserIds[member.get('userId')] = true);

        messages.push({
            id: 'CREATE',
            windowId: window.id,
            network: conversation.get('network'),
            name: conversation.get('name'),
            userId: oneOnOneMember && oneOnOneMember.get('userId'),
            type: conversation.get('type'),
            password: conversation.get('password'),
            topic: conversation.get('topic'),
            alerts: {
                email: window.get('emailAlert'),
                notification: window.get('notificationAlert'),
                sound: window.get('soundAlert'),
                title: window.get('titleAlert')
            },
            role: role,
            column: window.get('column'),
            row: window.get('row'),
            desktop: window.get('desktop'),
            minimizedNamesList: window.get('minimizedNamesList')
        });

        messages.push({
            id: 'ADDMEMBERS',
            windowId: window.id,
            reset: true,
            members: members.map(member => ({
                userId: member.get('userId'),
                role: member.get('role')
            }))
        });

        const lines = await redis.lrange(`conversationmsgs:${conversation.id}`, 0, -1);
        const firstBacklogMessage = lines.length - maxBacklogLines;

        lines.forEach(message => {
            message = JSON.parse(message);

            const newMsg = message.gid >= firstBacklogMessage && message.gid > cachedUpto;
            const newEdit = message.status !== null && message.editTs >= cachedUpto

            if (newMsg || newEdit) {
                message.id = 'MSG'
                message.windowId = window.id;
                delete message.editTs; // editTs is an internal property

                messages.push(message);
                seenUserIds[message.userId] = true;
            }
        });
    }

    const userIdList = Object.keys(seenUserIds);
    userIdList.push(user.gId); // Always include info about the user itself

    await redis.run('introduceNewUserIds', user.gId, sessionId, null, false, ...userIdList);

    messages.push({
        id: 'INITDONE'
    });

    await notification.send(user, sessionId, messages);
};
