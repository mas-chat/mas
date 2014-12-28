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
    wait = require('co-wait'),
    faker = require('faker'),
    redis = require('./redis').createClient(),
    log = require('./log'),
    conf = require('./conf');

module.exports.enable = function() {
    co(function*() {
        while (1) {
            yield wait(2000);

            var demoUserEmail = conf.get('frontend:demo_user_email');
            var demoUserId = yield redis.hget('index:user', demoUserEmail);
            var sentenceLength = Math.floor((Math.random() * 30 ) + 1);

            if (!demoUserId) {
                log.error('Demo user doesn\'t exist.');
                continue;
            }

            var details = yield redis.srandmember('windowlist:' + demoUserId);

            if (details) {
                // User has at least one window
                var url = '';
                if (!(Math.floor(Math.random() * 10 ))) {
                    var randomImgFileName = Math.floor(Math.random() * 1000000);
                    url = 'http://placeimg.com/640/480/nature/' + randomImgFileName + '.jpg';
                }

                var windowId = parseInt(details);
                var msg = {
                    body: faker.Lorem.sentence(sentenceLength) + ' ' + url,
                    userId: 'mDEMO', // TBD: This user must exist
                    cat: 'msg'
                };

                // TDB: Use conversation lib instead
                // yield textLine.send(demoUserId, windowId, msg);
            }
        }
    })();
};
