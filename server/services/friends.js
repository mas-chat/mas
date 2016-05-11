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

const Promise = require('bluebird'),
      Friend = require('../models/friend'),
      notification = require('../lib/notification');

const EPOCH_DATE = new Date(1);

// TBD: Instead of FRIENDS and FRIENDSUPDATE, use ADDFRIENDS

exports.sendFriends = async function(user, sessionId) {
    const command = {
        id: 'FRIENDS',
        reset: true,
        friends: []
    };

    const friendUsers = await getFriendUsers(user);

    for (let friendUser of friendUsers) {
        const last = friendUser.get('lastLogout');
        const online = last === null;

        const friendData = {
            userId: `m${friendUser.id}`,
            online: online
        };

        if (!online) {
            friendData.last = last < EPOCH_DATE ? -1 : Math.floor(last.getTime() / 1000);
        }

        command.friends.push(friendData);
    }

    if (sessionId) {
        await notification.send(user, sessionId, command);
    } else {
        await notification.broadcast(user, command);
    }
};

exports.sendFriendConfirm = async function(user, sessionId) {
    const friendAsDst = await Friend.find({ dstUserId: user.id });

    const friendUsers = friendAsDst.filter(record => record.get('state') === 'pending');

    if (friendUsers.length > 0) {
        // Uses userId property so that related USERS notification is send automatically
        // See lib/notification.js for the details.
        await notification.send(user, sessionId, {
            id: 'FRIENDSCONFIRM',
            friends: friendUsers.map(friendUser => ({ userId: friendUser.gId }))
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

    const friendUsers = await getFriendUsers(user);

    for (let friendUser of friendUsers) {
        await notification.broadcast(friendUser, command);
    }
};

exports.removeUser = async function(user) {
    const [ friendAsSrc, friendAsDst ] = await Promise.all([
        Friend.find({ srcUserId: user.id }),
        Friend.find({ dstUserId: user.id })
    ]);

    const friends = friendAsSrc.concat(friendAsDst);

    for (let friend of friends) {
        await friend.delete();
    }
};

async function getFriendUsers(user) {
    const [ friendAsSrc, friendAsDst ] = await Promise.all([
        Friend.find({ srcUserId: user.id }),
        Friend.find({ dstUserId: user.id })
    ]);

    return friendAsSrc.concat(friendAsDst).filter(record => record.get('state') === 'active');
}
