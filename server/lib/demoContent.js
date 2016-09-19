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

const redis = require('./redis').createClient();
const log = require('./log');
const conf = require('./conf');
const masWindow = require('../services/windows');
const conversationFactory = require('../models/conversation');

exports.enable = function enable() {
    setInterval(async function interval() {
        const demoUserEmail = conf.get('frontend:demo_user_email');
        const demoUserId = await redis.hget('index:user', demoUserEmail);

        if (!demoUserId) {
            log.error('Demo user doesn\'t exist.');
            return;
        }

        const windowId = await redis.srandmember(`windowlist:${demoUserId}`);

        if (windowId) {
            // User has at least one window
            const conversationId = await masWindow.getConversationId(demoUserId, windowId);
            const conversation = await conversationFactory.get(conversationId);
            let url = '';

            if (!(Math.floor(Math.random() * 10))) {
                const randomImgFileName = Math.floor(Math.random() * 1000000);
                url = `http://placeimg.com/640/480/nature/${randomImgFileName}.jpg`;
            }

            await conversation.addMessage({
                body: `Lorem ipsum dolor sit amet, consectetur adipiscing elit ${url}`,
                userId: 'm0',
                cat: 'msg'
            });
        }
    }, 2000);
};
