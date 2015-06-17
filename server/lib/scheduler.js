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

const co = require('co'),
      _ = require('lodash'),
      CronJob = require('cron').CronJob,
      redis = require('./redis').createClient(),
      log = require('./log'),
      init = require('./init'),
      conf = require('./conf'),
      mailer = require('./mailer'),
      friends = require('../models/friends');

exports.init = function() {
    // Once in an hour
    let sessionJob = new CronJob('0 0 */1 * * *', deleteStaleSessions, null, true);
    // Once in 15 minutes
    let emailJob = new CronJob('0 */10 * * * *', deliverEmails, null, true);

    init.on('shutdown', function() {
        sessionJob.stop();
        emailJob.stop();
    });
};

// Cleans stale sessions that might exist because of server crash
function deleteStaleSessions() {
    log.info('Running deleteStaleSessions job');

    co(function*() {
        let ts = Math.round(Date.now() / 1000) - conf.get('session:idle_timeout');
        let list = yield redis.zrangebyscore('sessionlastheartbeat', '-inf', ts);

        for (let item of list) {
            let fields = item.split(':');
            let userId = fields[0];
            let sessionId = fields[1];

            let last = yield redis.run('deleteSession', userId, sessionId);
            log.info(userId, 'Removed stale session. SessionId: ' + sessionId);

            if (last) {
                yield friends.informStateChange(userId, 'logout');
            }
        }
    })();
}

// Sends email notifications to offline users
function deliverEmails() {
    log.info('Running deliverEmails job');

    function groupNotifications(ntf) {
        return ntf.groupName ? `Group: ${ntf.groupName}` : `1-on-1: ${ntf.senderName}`;
    }

    co(function*() {
        let userIds = yield redis.smembers('emailnotifications');

        for (let userId of userIds) {
            let notificationIds = yield redis.smembers(`emailnotificationslist:${userId}`);
            let notifications = [];

            for (let notificationId of notificationIds) {
                let notification = yield redis.hgetall(`emailnotification:${notificationId}`);

                if (notification) {
                    notifications.push(notification);
                }
            }

            notifications = _.groupBy(notifications, groupNotifications);

            let user = yield redis.hgetall(`user:${userId}`);

            // TBD: Better would be to clear pending notifications during login
            if (parseInt(user.lastlogout) !== 0) {
                mailer.send('emails/build/mentioned.hbs', {
                    name: user.name,
                    notifications: notifications
                }, user.email, `You were just mentioned on MeetAndSpeak`);
            }

            for (let notificationId of notificationIds) {
                yield redis.del(`emailnotification:${notificationId}`);
            }

            yield redis.del(`emailnotificationslist:${userId}`);
            yield redis.srem('emailnotifications', userId);
        }
    })();
}
