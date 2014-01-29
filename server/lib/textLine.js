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

// TDB Consider options:
//
// timestamp
// type
// rememberurl
// hidden

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

        var line = JSON.stringify({
            id: 'ADDTEXT',
            window: windowId,
            body: text,
            cat: cat,
            ts: '209',
            nick: nick,
            type: 0
        });

        //TBD: Fix me!
        //if (windowNetwork === network) {
        if (1) {
            // TBD: Push Json message
            yield redis.lpush('windowmsgs:' + userId + ':' + windowId, line);
            yield outbox.queue(userId, line);
        }
    }
};
