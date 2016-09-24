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

const _ = require('lodash');
const CronJob = require('cron').CronJob;
const redis = require('./redis').createClient();
const log = require('./log');
const mailer = require('./mailer');
const User = require('../models/user');
const UserGId = require('../models/userGId');

const jobs = [];

exports.init = function init() {
    // Once in 15 minutes
    jobs.push(new CronJob('0 */10 * * * *', deliverEmails, null, true));
};

exports.quit = function quit() {
    for (const job of jobs) {
        job.stop();
    }
};

// Sends email notifications to offline users
async function deliverEmails() {
    log.info('Running deliverEmails job');

    function groupNotifications(ntf) {
        return ntf.groupName ? `Group: ${ntf.groupName}` : `1-on-1: ${ntf.senderName}`;
    }

    const userGIdStrings = await redis.smembers('emailnotifications');

    for (const userGIdString of userGIdStrings) {
        const notificationIds = await redis.lrange(
            `emailnotificationslist:${userGIdString}`, 0, -1);
        let notifications = [];

        for (const notificationId of notificationIds) {
            const notification = await redis.hgetall(`emailnotification:${notificationId}`);

            if (notification) {
                notifications.push(notification);
            }
        }

        notifications = _.groupBy(notifications, groupNotifications);

        const userGId = UserGId.create(userGIdString);
        const user = await User.fetch(userGId.id);

        // TODO: Better would be to clear pending notifications during login
        if (!(await user.isOnline())) {
            mailer.send('emails/build/mentioned.hbs', {
                name: user.get('name'),
                notifications
            }, user.get('email'), 'You were just mentioned on MeetAndSpeak');
        }

        for (const notificationId of notificationIds) {
            await redis.del(`emailnotification:${notificationId}`);
        }

        await redis.del(`emailnotificationslist:${userGIdString}`);
        await redis.srem('emailnotifications', userGIdString);
    }
}
