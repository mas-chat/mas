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

exports.getWindowIdsForNetwork = function*(userId, network) {
    var ids = yield getWindowIds(userId, network, null, null, 'id');

    return ids;
};

exports.getGroupWindowIdsForNetwork = function*(userId, network) {
    var ids = yield getWindowIds(userId, network, null, 'group', 'id');

    return ids;
};

exports.getGroupWindowId = function*(userId, network, name) {
    var ids = yield getWindowIds(userId, network, name, 'group', 'id');

    if (ids.length === 1) {
        return ids[0];
    } else {
        log.info(userId, 'Tried to find non-existing group window: ' + name);
        return null;
    }
};

exports.get1on1WindowId = function*(userId, network, targetUserId) {
    var ids = yield getWindowIds(userId, network, targetUserId, '1on1', 'id');

    if (ids.length === 1) {
        return ids[0];
    } else {
        log.info(userId, 'Tried to find non-existing 1on1 window: ' + targetUserId);
        return null;
    }
};

exports.getWindowIdByTargetUserId = function*(userId, targetUserId) {
    var ids = yield getWindowIds(userId, null, null, null, 'id');

    for (var i = 0; i < ids.length; i++) {
        var window = yield redis.hgetall('window:' + userId + ':' + ids[i]);

        if (window.targetUserId === targetUserId) {
            return ids[i];
        }
    }

    return null;
};

exports.getNetworks = function*(userId) {
    var networks = {};

    var windows = yield redis.smembers('windowlist:' + userId);
    for (var i = 0; i < windows.length; i++) {
        var windowNetwork = yield redis.hget('window:' + userId + ':' + windows[i], 'network');
        networks[windowNetwork] = true;
    }

    return Object.keys(networks);
};

exports.getWindowNameAndNetwork = function*(userId, windowId) {
    return yield getWindowNameAndNetwork(userId, windowId);
};

exports.createNewWindow = function*(userId, network, name, password, type) {
    var windowId = yield redis.hincrby('user:' + userId, 'nextwindowid', 1);

    assert(type === '1on1' || type === 'group');

    var newWindow = {
        windowId: windowId,
        network: network,
        type: type,
        sounds: false,
        titleAlert: false,
        userMode: 'owner',
        visible: true,
        row: 0,
        password: password === null ? '' : password,
        topic: ''
    };

    if (type === 'group') {
        newWindow.name = name;
    } else {
        newWindow.userId = name;
    }

    yield redis.hmset('window:' + userId + ':' + windowId, newWindow);
    yield redis.sadd('windowlist:' + userId, windowId);

    if (newWindow.password === '') {
        newWindow.password = null; // Undo 'Redis can't store NULL' fix
    }
    newWindow.id = 'CREATE';
    return newWindow;
};

function *getWindowNameAndNetwork(userId, windowId) {
    var details = yield redis.hgetall('window:' + userId + ':' + windowId);

    return {
        name: details ? details.name : null,
        userId: details ? details.userId : null,
        network: details ? details.network : null,
        type: details ? details.type : null
    };
}

function *getWindowIds(userId, network, nameOrUserId, type, returnType) {
    var windows = yield redis.smembers('windowlist:' + userId);
    var ret = [];

    for (var i = 0; i < windows.length; i++) {
        var candidateWindowId = parseInt(windows[i]);
        var candidate = yield getWindowNameAndNetwork(userId, candidateWindowId);

        if (network && candidate.network !== network) {
            continue;
        }

        if (type && type !== candidate.type) {
            continue;
        }

        if (nameOrUserId && type === 'group' && candidate.name !== nameOrUserId) {
            continue;
        }

        if (nameOrUserId && type === '1on1' && candidate.userId !== nameOrUserId) {
            continue;
        }

        // We have a match

        if (returnType === 'id') {
            ret.push(candidateWindowId);
        } else if (returnType === 'name') {
            ret.push(candidate.name);
        }
    }

    return ret;
}
