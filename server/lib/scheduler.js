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
    cronJob = require('cron').CronJob,
    redis = require('./redis').createClient(),
    log = require('./log');

exports.init = function() {
    // Once in an hour
    new cronJob('* * * * * *', removeIdleSessions, null, true);
};

function removeIdleSessions() {
    co(function *() {
        var cursor = 0, result, batch = [];

        do {
           // Keep count reasonable so redis calls will hopefully be minimized
           result = yield redis.scan([ cursor, 'MATCH', 'session:*', 'COUNT', 500 ]);
           cursor = parseInt(result[0]);
           var matches = result[1];

           if (matches.length !== 0) {
               batch.push(matches);
           }

           // Minimize also lua calls
           if (batch.length > 500 || cursor === 0) {
              var params = [ 'removeIdleSessions' ].concat(batch);
              yield redis.run.apply(this, params);
              batch = [];
           }
        } while (cursor !== 0);

        log.info('Removed idle sessions.');
    })();
}
