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

const Promise = require('bluebird');
const UserGId = require('../models/userGId');
const User = require('../models/user');
const Friend = require('../models/friend');
const notification = require('../lib/notification');

const EPOCH_DATE = new Date(1);

// TODO: Instead of FRIENDS and FRIENDSUPDATE, use ADDFRIENDS

exports.sendFriends = function sendFriends(user, sessionId) {
    sendFriendsNtf(user, sessionId);
};

exports.sendFriendConfirm = async function sendFriendConfirm(user, sessionId) {
    const friendAsDst = await Friend.find({ srcUserId: user.id });
    const friendUsers = friendAsDst.filter(friend => friend.get('state') === 'pending');

    if (friendUsers.length > 0) {
        // Uses userId property so that related USERS notification is send automatically
        // See lib/notification.js for the details.
        const ntf = {
            id: 'FRIENDSCONFIRM',
            friends: friendUsers.map(friendUser => {
                const friendUserGId = UserGId.create({
                    id: friendUser.get('dstUserId'),
                    type: 'mas'
                });

                return { userId: friendUserGId.toString() };
            })
        };

        if (sessionId) {
            await notification.send(user, sessionId, ntf);
        } else {
            await notification.broadcast(user, ntf);
        }
    }
};

exports.informStateChange = async function informStateChange(user, eventType) {
    const command = {
        id: 'FRIENDS',
        reset: false,
        friends: [ {
            userId: user.gId.toString(),
            online: eventType === 'login',
            last: Math.round(Date.now() / 1000)
        } ]
    };

    if (eventType === 'logout') {
        await user.set('lastLogout', new Date());
    }

    const friendUsers = await getFriendUsers(user);

    for (const friendUser of friendUsers) {
        await notification.broadcast(friendUser, command);
    }
};

exports.createPending = async function createPending(user, friendUser) {
    await Friend.create({
        srcUserId: user.id,
        dstUserId: friendUser.id,
        state: 'asking'
    });

    await Friend.create({
        srcUserId: friendUser.id,
        dstUserId: user.id,
        state: 'pending'
    });
};

exports.activateFriends = async function activeFriends(user, friendUser) {
    const srcFriend = await Friend.findFirst({
        srcUserId: user.id,
        dstUserId: friendUser.id
    });

    const dstFriend = await Friend.findFirst({
        srcUserId: friendUser.id,
        dstUserId: user.id
    });

    await srcFriend.set({ state: 'active' });
    await dstFriend.set({ state: 'active' });

    // Inform both parties
    await sendFriendsNtf(user);
    await sendFriendsNtf(friendUser);
};

exports.removeFriends = async function removeFriends(user, friendUser) {
    const srcFriend = await Friend.findFirst({
        srcUserId: user.id,
        dstUserId: friendUser.id
    });

    const dstFriend = await Friend.findFirst({
        srcUserId: friendUser.id,
        dstUserId: user.id
    });

    await srcFriend.delete();
    await dstFriend.delete();
};

exports.removeUser = async function removeUser(user) {
    const [ friendAsSrc, friendAsDst ] = await Promise.all([
        Friend.find({ srcUserId: user.id }),
        Friend.find({ dstUserId: user.id })
    ]);

    const friends = friendAsSrc.concat(friendAsDst);

    for (const friend of friends) {
        await friend.delete();
    }
};

async function sendFriendsNtf(user, sessionId) {
    const command = {
        id: 'FRIENDS',
        reset: true,
        friends: []
    };

    const friendUsers = await getFriendUsers(user);

    for (const friendUser of friendUsers) {
        const last = friendUser.get('lastLogout');
        const online = await friendUser.isOnline();

        const friendData = {
            userId: `m${friendUser.id}`,
            online
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
}

async function getFriendUsers(user) {
    const friends = await Friend.find({ srcUserId: user.id });
    const activeFriends = friends.filter(friend => friend.get('state') === 'active');
    const friendUsers = [];

    for (const friend of activeFriends) {
        friendUsers.push(await User.fetch(friend.get('dstUserId')));
    }

    return friendUsers;
}
