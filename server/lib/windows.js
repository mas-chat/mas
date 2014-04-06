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

var assert = require('assert'),
    redis = require('./redis').createClient(),
    log = require('./log');

exports.getWindowIdsForNetwork = function *(userId, network) {
    var ids = yield getWindowIds(userId, network, null, null, 'id');

    return ids;
};

exports.getWindowId = function *(userId, network, name, type) {
    var ids = yield getWindowIds(userId, network, name, type, 'id');

    if (ids.length === 1) {
        return ids[0];
    } else {
        log.warn(userId, 'Tried to find non-existing window: ' + name);
        return null;
    }
};

exports.getWindowIdByTargetUserId = function *(userId, targetUserId) {
    var ids = yield getWindowIds(userId, null, null, null, 'id');

    for (var i = 0; i < ids.length; i++) {
        var window = yield redis.hgetall('window:' + userId + ':' + ids[i]);

        if (window.targetUserId === targetUserId) {
            return ids[i];
        }
    }

    return null;
};

exports.getWindowNameAndNetwork = function *(userId, windowId) {
    var windows = yield redis.smembers('windowlist:' + userId);

    for (var i = 0; i < windows.length; i++) {
        var details = windows[i].split(':');
        if (parseInt(details[0]) === windowId) {
            return [ details[2],  details[1], details[3] ];
        }
    }

    return [ null, null, null ];
};

exports.getWindowNamesForNetwork = function *(userId, network) {
    var ids = yield getWindowIds(userId, network, null, null, 'name');

    return ids;
};

exports.getNetworks = function *(userId) {
    var networks = {};

    var windows = yield redis.smembers('windowlist:' + userId);
    for (var i = 0; i < windows.length; i++) {
        var details = windows[i].split(':');
        var windowNetwork = details[1];

        networks[windowNetwork] = true;
    }

    return Object.keys(networks);
};

exports.createNewWindow = function *(userId, network, name, password, type) {
    var windowId = yield redis.hincrby('user:' + userId, 'nextwindowid', 1);

    assert(type === '1on1' || type === 'group');

    var newWindow = {
        windowId: windowId,
        network: network,

        name: name,
        type: type,
        sounds: false,
        titleAlert: false,
        userMode: 'owner',
        visible: true,
        row: 0,
        password: password,
        topic: ''
    };

    yield redis.hmset('window:' + userId + ':' + windowId, newWindow);
    yield redis.sadd('windowlist:' + userId, windowId + ':' + network + ':' + name + ':' + type);

    newWindow.id = 'CREATE';
    return newWindow;
};

function *getWindowIds(userId, network, name, type, returnType) {
    var windows = yield redis.smembers('windowlist:' + userId);
    var ret = [];

    for (var i = 0; i < windows.length; i++) {
        var details = windows[i].split(':');
        var windowId = parseInt(details[0]);
        var windowNw = details[1];
        var windowName = details[2];
        var windowType = details[3];

        if (!network || windowNw === network && (!name || windowName === name) &&
            (!type || type === windowType)) {
            if (returnType === 'id') {
                ret.push(windowId);
            } else if (returnType === 'name') {
                ret.push(windowName);
            }
        }
    }

    return ret;
}
