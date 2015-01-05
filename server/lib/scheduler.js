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

var co = require('co'),
    CronJob = require('cron').CronJob,
    redis = require('./redis').createClient(),
    log = require('./log'),
    conf = require('./conf'),
    friends = require('../models/friends');

exports.init = function() {
    // Once in a minute
    new CronJob('0 */1 * * * *', deleteIdleSessions, null, true);
};

function deleteIdleSessions() {
    log.info('Running deleteIdleSessions job');

    co(function*() {
        var ts = Math.round(Date.now() / 1000) - conf.get('session:idle_timeout');
        var list = yield redis.zrangebyscore('sessionlastheartbeat', '-inf', ts);

        for (var i = 0; i < list.length; i++) {
            var fields = list[i].split(':');
            var userId = fields[0];
            var sessionId = fields[1];

            var last = yield redis.run('deleteSession', userId, sessionId);
            log.info(userId, 'Removed idle session. SessionId: ' + sessionId);

            if (last) {
                yield friends.informStateChange(userId, 'logout');
            }
        }
    })();
}
