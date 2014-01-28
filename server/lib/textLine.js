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

var wrapper = require('co-redis'),
    redis = wrapper(require('redis').createClient()),
    outbox = require('./outbox.js');

exports.broadcast = function *(userId, network, nick, cat, text) {
    // TBD: Copy paste from listen.js

    //Iterate through windows
    var windows = yield redis.smembers('windowlist:' + userId);

    for (var i = 0; i < windows.length; i++) {
        var details = windows[i].split(':');
        var windowId = details[0];
        var windowNetwork = details[1];
        var windowName = details[2];

        windowNetwork = windowNetwork; // TBD
        windowName = windowName; // TBD

        //TBD: Fix me!
        //if (windowNetwork === network) {
        if (1) {
            // TBD: Push Json message
            yield redis.rpush('windowmsgs:' + userId + ':' + windowId, text);

            yield outbox.queue(userId, {
                id: 'ADDTEXT',
                window: windowId,
                body: text,
                cat: cat,
                ts: '209',
                nick: nick,
                type: 0
            });

            // TBD: Rely on blocking lget in listen.js, remove this pubsub
            redis.publish('useroutbox:' + userId , 'message');
        }
    }
};
