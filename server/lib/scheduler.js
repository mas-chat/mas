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

const _ = require('lodash'),
      CronJob = require('cron').CronJob,
      redis = require('./redis').createClient(),
      log = require('./log'),
      conf = require('./conf'),
      mailer = require('./mailer'),
      UserGId = require('../model/UserGId'),
      User = require('../model/user'),
      friends = require('../services/friends');

let jobs = [];

exports.init = function() {
    // Once in an hour
    jobs.push(new CronJob('0 0 */1 * * *', deleteStaleSessions, null, true));
    // Once in 15 minutes
    jobs.push(new CronJob('0 */10 * * * *', deliverEmails, null, true));
};

exports.quit = function() {
    for (let job of jobs) {
        job.stop();
    }
};

// Cleans stale sessions that might exist because of server crash
async function deleteStaleSessions() {
    log.info('Running deleteStaleSessions job');

    let ts = Math.round(Date.now() / 1000) - conf.get('session:idle_timeout');
    let list = await redis.zrangebyscore('sessionlastheartbeat', '-inf', ts);

    for (let item of list) {
        let fields = item.split(':');
        let userGIdString = fields[0];
        let sessionId = fields[1];
        const user = User.fetch(new UserGId(userGIdString).id);

        let last = await redis.run('deleteSession', userGIdString, sessionId);
        log.info(user, 'Removed stale session. SessionId: ' + sessionId);

        if (last) {
            await friends.informStateChange(user, 'logout');
        }
    }
}

// Sends email notifications to offline users
async function deliverEmails() {
    log.info('Running deliverEmails job');

    function groupNotifications(ntf) {
        return ntf.groupName ? `Group: ${ntf.groupName}` : `1-on-1: ${ntf.senderName}`;
    }

    let userIds = await redis.smembers('emailnotifications');

    for (let userId of userIds) {
        let notificationIds = await redis.lrange(`emailnotificationslist:${userId}`, 0, -1);
        let notifications = [];

        for (let notificationId of notificationIds) {
            let notification = await redis.hgetall(`emailnotification:${notificationId}`);

            if (notification) {
                notifications.push(notification);
            }
        }

        notifications = _.groupBy(notifications, groupNotifications);

        let user = await redis.hgetall(`user:${userId}`);

        // TBD: Better would be to clear pending notifications during login
        if (parseInt(user.lastlogout) !== 0) {
            mailer.send('emails/build/mentioned.hbs', {
                name: user.name,
                notifications: notifications
            }, user.email, `You were just mentioned on MeetAndSpeak`);
        }

        for (let notificationId of notificationIds) {
            await redis.del(`emailnotification:${notificationId}`);
        }

        await redis.del(`emailnotificationslist:${userId}`);
        await redis.srem('emailnotifications', userId);
    }
}
