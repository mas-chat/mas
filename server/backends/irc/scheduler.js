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

const CronJob = require('cron').CronJob;
const redis = require('../../lib/redis').createClient();
const log = require('../../lib/log');
const conf = require('../../lib/conf');
const courier = require('../../lib/courier').create();

const jobs = [];

exports.init = function init() {
    // Twice in a day
    jobs.push(new CronJob('0 0 7,19 * * *', disconnectInactiveIRCUsers, null, true));
};

exports.quit = async function quit() {
    jobs.forEach(job => job.stop());

    await courier.quit();
};

async function disconnectInactiveIRCUsers() {
    log.info('Running disconnectInactiveIRCUsers job');

    const inactivityTimeout = conf.get('irc:inactivity_timeout') * 24 * 60 * 60;
    const minAllowedLogoutTime = Math.round(Date.now() / 1000) - inactivityTimeout;
    const users = await redis.smembers('userlist'); // TBD: Doesn't scale too far
    const networks = await redis.smembers('networklist');

    for (const userId of users) {
        const lastLogout = parseInt(await redis.hget(`user:${userId}`, 'lastlogout'));

        if (lastLogout !== 0 && lastLogout < minAllowedLogoutTime) {
            for (const network of networks) {
                const state = await redis.hget(`networks:${userId}:${network}`, 'state');

                if (state === 'connected') {
                    await redis.hset(`networks:${userId}:${network}`, 'state', 'idleclosing');

                    courier.callNoWait('connectionmanager', 'disconnect', {
                        userId,
                        network,
                        reason: 'Inactive user.'
                    });

                    log.info(userId,
                        `Disconnected inactive user. UserId: ${userId}, network: ${network}`);
                }
            }
        }
    }
}
