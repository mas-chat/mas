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
            var sentenceLength = Math.floor((Math.random() * 30 ) + 1);

            if (demoUserId) {
                var details = yield redis.srandmember('windowlist:' + demoUserId);

                if (details) {
                    // User has at least one window
                    var url = '';
                    if (!(Math.floor(Math.random() * 10 ))) {
                        var randomImgFileName = Math.floor(Math.random() * 1000000);
                        url = 'http://placeimg.com/640/480/nature/' + randomImgFileName + '.jpg';
                    }

                    var windowId = parseInt(details.split(':')[0]);
                    var msg = {
                        body: faker.Lorem.sentence(sentenceLength) + ' ' + url,
                        nick: faker.Name.firstName(),
                        cat: 'msg',
                        windowId: windowId
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

exports.send = function *(userId, network, name, type, msg) {
    msg.windowId = yield windowHelper.getWindowId(userId, network, name, type);
    yield processTextLine(userId, msg, null);
};

exports.sendByWindowId = function *(userId, windowId, msg, excludeSession) {
    msg.windowId = windowId;
    yield processTextLine(userId, msg, excludeSession);
};

exports.sendFromUserId = function *(userId, targetUserId, msg) {
    msg.windowId = yield windowHelper.getWindowIdByTargetUserId(targetUserId, userId);
    yield processTextLine(targetUserId, msg, null);
};

function *processTextLine(userId, msg, excludeSession) {
    if (!('windowId' in msg)) {
        return;
    }

    msg.id = 'ADDTEXT';
    msg.ts = Math.round(Date.now() / 1000);
    msg.gid = yield redis.incr('nextGlobalMsgId');

    var command = JSON.stringify(msg);

    yield redis.run('processTextLine', userId, msg.windowId, command, excludeSession);
}
