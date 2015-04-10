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

const redis = require('../lib/redis').createClient(),
      outbox = require('../lib/outbox');

// TBD: Instead of FRIENDS and FRIENDSUPDATE, use ADDFRIENDS

exports.sendFriends = function*(userId, sessionId) {
    let command = {
        id: 'FRIENDS',
        friends: []
    };

    let friendIds = yield redis.smembers(`friends:${userId}`);

    // TBD: Do the looping in lua to enhance performance
    for (let friendUserId of friendIds) {
        let last = yield redis.hget(`user:${friendUserId}`, 'lastlogout');
        last = parseInt(last);

        let online = last === 0;

        if (isNaN(last)) {
            last = -1; // No recorded login or logout
        }

        let friendData = {
            userId: friendUserId,
            online: online
        };

        if (!online) {
            friendData.last = last;
        }

        command.friends.push(friendData);
    }

    if (sessionId) {
        yield outbox.queue(userId, sessionId, command);
    } else {
        yield outbox.queueAll(userId, command);
    }
};

exports.sendFriendConfirm = function*(userId, sessionId) {
    let friendRequests = yield redis.smembers(`friendsrequests:${userId}`);

    // Use userId property so that related USERS notification is send automatically
    // See lib/outbox.js for details.
    friendRequests = friendRequests.map(function(userId) {
        return { userId: userId };
    });

    if (friendRequests) {
        yield outbox.queue(userId, sessionId, {
            id: 'FRIENDSCONFIRM',
            friends: friendRequests
        });
    }
};

exports.informStateChange = function*(userId, eventType) {
    let command = {
        id: 'FRIENDSUPDATE',
        userId: userId
    };
    let ts;

    // Zero means the user is currently online
    if (eventType === 'login') {
        ts = 0;
        command.online = true;
    } else {
        ts = Math.round(Date.now() / 1000);
        command.last = ts;
        command.online = false;
    }

    yield redis.hset(`user:${userId}`, 'lastlogout', ts);

    let friendIds = yield redis.smembers(`friends:${userId}`);

    for (let friendUserId of friendIds) {
        yield outbox.queueAll(friendUserId, command);
    }
};
