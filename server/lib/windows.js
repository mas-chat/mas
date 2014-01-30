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
    log = require('../../lib/log');

exports.getWindowIdsForNetwork = function *(userId, network) {
    var ids = yield getWindowIds(userId, network, null);

    return ids;
};

exports.getWindowId = function *(userId, network, group) {
    var ids = yield getWindowIds(userId, network, group);

    if (ids.length === 1) {
        return ids[0];
    } else {
        log.warn(userId, 'Tried to find non-existing group: ' + group);
        return null;
    }
};

function *getWindowIds(userId, network, group) {
    var windows = yield redis.smembers('windowlist:' + userId);
    var ids = [];

    for (var i = 0; i < windows.length; i++) {
        var details = windows[i].split(':');
        var windowId = details[0];
        var windowNetwork = details[1];
        var windowName = details[2];

        if (windowNetwork === network && (!group || windowName === group)) {
            ids.push(windowId);
        }
    }

    return ids;
}
