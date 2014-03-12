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
    Faker = require('Faker'),
    redis = require('./redis').createClient(),
    log = require('./log'),
    windowHelper = require('./windows'),
    conf = require('./conf');

// TDB Consider options:
//
// timestamp
// type
// rememberurl
// hidden

if (conf.get('frontend:demo_mode') === true) {
    co(function *() {
        while (1) {
            yield wait(4000);

            var demoUserEmail = conf.get('frontend:demo_user_email');
            var demoUserId = parseInt(yield redis.hget('index:user', demoUserEmail));
            var sentenceLength = Math.floor((Math.random() * 30 ) + 1)

            if (demoUserId) {
                var details = yield redis.srandmember('windowlist:' + demoUserId);

                if (details) {
                    // User has at least one window
                    var url = Math.floor((Math.random() * 10 )) ? '' : Faker.Image.technics(640, 480);

                    var windowId = parseInt(details.split(':')[0]);
                    var msg = {
                        body: Faker.Lorem.sentence(sentenceLength) + ' ' + url,
                        nick: Faker.Name.firstName(),
                        cat: 'msg',
                        windowId: windowId,
                        ts: Math.round(Date.now() / 1000)
                    };

                    yield processTextLine(demoUserId, msg, null);
                }
            } else {
                log.error('Demo user doesn\'t exist.');
            }
        }
    })();
}

exports.broadcast = function *(userId, network, msg) {
    var windowIds = yield windowHelper.getWindowIdsForNetwork(userId, network);

    for (var i = 0; i < windowIds.length; i++) {
        msg.windowId = windowIds[i];
        yield processTextLine(userId, msg, null);
    }
};

exports.send = function *(userId, network, group, msg) {
    msg.windowId = yield windowHelper.getWindowId(userId, network, group);
    yield processTextLine(userId, msg, null);
};

exports.sendByWindowId = function *(userId, windowId, msg, excludeSession) {
    msg.windowId = windowId;
    yield processTextLine(userId, msg, excludeSession);
};

function *processTextLine(userId, msg, excludeSession) {
    if (!('windowId' in msg)) {
        return;
    }

    msg.id = 'ADDTEXT';
    msg.type = 0; // TBD

    var command = JSON.stringify(msg);

    yield redis.run('processTextLine', userId, msg.windowId, command, excludeSession);
}
