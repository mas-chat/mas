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
const log = require('../../lib/log');
const conf = require('../../lib/conf');
const courier = require('../../lib/courier').create();
const NetworkInfo = require('../../models/networkInfo');
const User = require('../../models/user');

const jobs = [];
let disconnect = null;

exports.init = function init(disconnectCB) {
    disconnect = disconnectCB;

    // Twice in a day
    jobs.push(cron.schedule('0 7,19 * * *', disconnectInactiveIRCUsers));
};

exports.quit = async function quit() {
    jobs.forEach(job => job.destroy());

    await courier.quit();
};

async function disconnectInactiveIRCUsers() {
    log.info('Running disconnectInactiveIRCUsers job');

    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - conf.get('irc:inactivity_timeout'));

    const networkInfos = await NetworkInfo.fetchAll();

    for (const networkInfo of networkInfos) {
        if (networkInfo.get('state') === 'connected') {
            const user = await User.fetch(networkInfo.get('userId'));

            if (!user.isOnline && user.get('lastLogout') < cutOffDate) {
                const network = networkInfo.get('network');

                await disconnect(user, network, 'idleclosing');
                log.info(user, `Disconnected inactive user, network: ${network}`);
            }
        }
    }
}
