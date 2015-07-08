//
//   Copyright 2014 Ilkka Oksanen <iao@iki.fi>
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

const util = require('util'),
      _ = require('lodash'),
      redisModule = require('./redis'),
      redis = redisModule.createClient();

exports.send = function*(userId, sessionId, ntfs) {
    yield queueNotifications(userId, sessionId, null, ntfs);
};

exports.broadcast = function*(userId, ntfs, excludeSessionId) {
    yield queueNotifications(userId, null, excludeSessionId, ntfs);
};

exports.receive = function*(userId, sessionId, timeout) {
    let command;
    let commands = [];

    let client = redisModule.createClient({ autoClose: false });
    let result = yield client.brpop(`outbox:${userId}:${sessionId}`, timeout);

    if (result) {
        commands.push(result[1]);
    }

    // Retrieve other ntfs if there are any
    while ((command = yield client.rpop(`outbox:${userId}:${sessionId}`)) !== null) {
        commands.push(command);
    }

    yield client.quit();

    return commands.map(function(value) {
        return JSON.parse(value);
    });
};

exports.requeue = function*(userId, sessionId, ntfs) {
    ntfs = ntfs.map(function(ntf) {
        return JSON.stringify(ntf);
    });

    yield redis.rpush.apply(redis, [ `outbox:${userId}:${sessionId}` ].concat(ntfs.reverse()));
};

function *queueNotifications(userId, sessionId, excludeSessionId, ntfs) {
    if (!util.isArray(ntfs)) {
        ntfs = [ ntfs ];
    }

    yield handleNewUserIds(userId, sessionId, excludeSessionId, ntfs);

    ntfs = ntfs.map(function(value) {
        return typeof(value) === 'string' ? value : JSON.stringify(value);
    });

    yield redis.run.apply(null,
        [ 'queueOutbox', userId, sessionId, excludeSessionId ].concat(ntfs));
}

function *handleNewUserIds(userId, sessionId, excludeSessionId, ntfs) {
    let allUserIds = [];

    ntfs.forEach(function(command) {
        allUserIds = allUserIds.concat(scanUserIds(command));
    });

    allUserIds = _.uniq(allUserIds);
    yield redis.run.apply(null,
        [ 'introduceNewUserIds', userId, sessionId, excludeSessionId, false ].concat(allUserIds));
}

function scanUserIds(obj) {
    let res = [];

    if (typeof(obj) === 'string') {
        obj = JSON.parse(obj);
    }

    for (let key in obj) {
        if (typeof obj[key] === 'object') {
            res = res.concat(scanUserIds(obj[key]));
        } else if (key === 'userId') {
            res.push(obj[key]);
        }
    }

    return res;
}
