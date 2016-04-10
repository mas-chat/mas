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

const Friend = require('../models/friend'),
      User = require('../models/user'),
      notification = require('../lib/notification');

const EPOCH_DATE = new Date(1);

// TBD: Instead of FRIENDS and FRIENDSUPDATE, use ADDFRIENDS

exports.sendFriends = async function(user, sessionId) {
    const command = {
        id: 'FRIENDS',
        reset: true,
        friends: []
    };

    const userIds = await getFriendUserIds(user);
    const friendUserRecords = await User.fetchMany(userIds);

    for (let friendRecord of friendUserRecords) {
        const last = friendRecord.get('lastLogout');
        const online = last === null;

        const friendData = {
            userId: `m${friendRecord.id}`,
            online: online
        };

        if (!online) {
            friendData.last = last < EPOCH_DATE ? -1 : Math.floor(last.getTime() / 1000);
        }

        command.friends.push(friendData);
    }

    if (sessionId) {
        await notification.send(user.id, sessionId, command);
    } else {
        await notification.broadcast(user.id, command);
    }
};

exports.sendFriendConfirm = async function(user, sessionId) {
    const friendAsDst = await Friend.find(user.id, 'dstUserId');

    const userIds = friendAsDst.filter(record => record.get('state') === 'pending');

    if (userIds.length > 0) {
        // Uses userId property so that related USERS notification is send automatically
        // See lib/notification.js for the details.
        await notification.send(user.id, sessionId, {
            id: 'FRIENDSCONFIRM',
            friends: userIds.map(friendUserId => ({ userId: friendUserId }))
        });
    }
};

exports.informStateChange = async function(user, eventType) {
    let command = {
        id: 'FRIENDS',
        reset: false,
        friends: [ {
            userId: user.id,
            online: eventType === 'login'
        } ]
    };

    // Zero means the user is currently online
    let ts = 0;

    if (eventType !== 'login') {
        ts = Date.now();
        command.friends[0].last = Math.round(ts / 1000);
    }

    await user.set('lastLogout', ts);

    const userIds = await getFriendUserIds(user);

    for (let friendUserId of userIds) {
        await notification.broadcast(friendUserId, command);
    }
};

exports.removeUser = async function(user) {
    const [ friendAsSrc, friendAsDst ] = await Promise.all([
        Friend.find(user.id, 'srcUserId'),
        Friend.find(user.id, 'dstUserId')
    ]);

    const friendIds = friendAsSrc.concat(friendAsDst);
    const friendUserRecords = await User.fetchMany(friendIds);

    for (let friend of friendUserRecords) {
        await friend.delete();
    }
};

async function getFriendUserIds(user) {
    const [ friendAsSrc, friendAsDst ] = await Promise.all([
        Friend.find(user.id, 'srcUserId'),
        Friend.find(user.id, 'dstUserId')
    ]);

    return friendAsSrc.concat(friendAsDst).filter(record =>
        record.get('state') === 'active').map(record =>
            record.get(record.get('srcUserId') === user.id ? 'dstUserId' : 'srcUserId'));
}
