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

var redis = require('./redis').createClient(),
    outbox = require('./outbox');

exports.sendFriends = function*(userId, sessionId) {
    var command = {
        id: 'FRIENDS',
        friends: []
    };

    var friendIds = yield redis.smembers('friends:' + userId);

    for (var i = 0; i < friendIds.length; i++) {
        var friendUserId = friendIds[i];

        var last = yield redis.hget('user:' + friendUserId, 'lastlogout');
        last = parseInt(last);

        var online = last === 0;

        if (isNaN(last)) {
            last = -1; // No recorded login or logout
        }

        var friendData = {
            userId: friendUserId,
            online: online
        };

        if (!online) {
            friendData.last = last;
        }

        command.friends.push(friendData);
    }

    yield outbox.queue(userId, sessionId, command);
};

exports.informStateChange = function*(userId, eventType) {
    var command = {
        id: 'FRIENDSUPDATE',
        userId: userId
    };
    var ts;

    // Zero means the user is currently online
    if (eventType === 'login') {
        ts = 0;
        command.online = true;
    } else {
        ts = Date.now() / 1000;
        command.last = ts;
        command.online = false;
    }

    yield redis.hset('user:' + userId, 'lastlogout', ts);

    var friendIds = yield redis.smembers('friends:' + userId);

    for (var i = 0; i < friendIds.length; i++) {
        var friendUserId = friendIds[i];
        yield outbox.queueAll(friendUserId, command);
    }
};
