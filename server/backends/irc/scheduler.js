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

const CronJob = require('cron').CronJob,
      redis = require('../../lib/redis').createClient(),
      log = require('../../lib/log'),
      conf = require('../../lib/conf'),
      courier = require('../../lib/courier').create();

let jobs = [];

exports.init = function() {
    // Twice in a day
    jobs.push(new CronJob('0 0 7,19 * * *', disconnectInactiveIRCUsers, null, true));
};

exports.quit = async function() {
    for (let job of jobs) {
        job.stop();
    }

    await courier.quit();
};

function disconnectInactiveIRCUsers() {
    log.info('Running disconnectInactiveIRCUsers job');

    let inactivityTimeout = conf.get('irc:inactivity_timeout') * 24 * 60 * 60;
    let minAllowedLogoutTime = Math.round(Date.now() / 1000) - inactivityTimeout;

    (async function() {
        let users = await redis.smembers('userlist'); // TBD: Doesn't scale too far
        let networks = await redis.smembers('networklist');

        for (let userId of users) {
            let lastLogout = parseInt(await redis.hget(`user:${userId}`, 'lastlogout'));

            if (lastLogout !== 0 && lastLogout < minAllowedLogoutTime) {
                for (let network of networks) {
                    let state = await redis.hget(`networks:${userId}:${network}`, 'state');

                    if (state === 'connected') {
                        await redis.hset(`networks:${userId}:${network}`, 'state', 'idleclosing');

                        courier.callNoWait('connectionmanager', 'disconnect', {
                            userId: userId,
                            network: network,
                            reason: 'Inactive user.'
                        });

                        log.info(userId, 'Disconnected inactive user. UserId: ' + userId +
                            ', network: ' + network);
                    }
                }
            }
        }
    })();
}
