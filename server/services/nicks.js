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

const assert = require('assert');
const NetworkInfo = require('../models/networkInfo');
const UserGId = require('../models/userGId');
const User = require('../models/user');

// User's master nick is stored in 'nick' property in user model. User's nicks in
// networks are stored in 'nick' property in networkInfo model. Currently master nick
// always equals to MAS nick and can differ in IRC network

exports.getNick = async function getNick(userGId, network) {
    if (userGId.isMASUser) {
        const nwInfo = await NetworkInfo.findFirst({ userId: userGId.id, network });
        return nwInfo ? nwInfo.get('nick') : null;
    } else if (userGId.toString() === 'i0') {
        return 'IRC server';
    }

    const encodedIrcNick = userGId.id;

    assert(typeof encodedIrcNick === 'string', 'Expected base64 encoded IRC nick');

    return new Buffer(encodedIrcNick, 'base64').toString('ascii');
};

exports.getUser = async function getUser(nick, network) {
    return fetchUser(nick, network);
};

exports.getUserGId = async function getUserGId(nick, network) {
    const masUser = await fetchUser(nick, network);

    if (masUser) {
        return masUser.gId;
    }

    if (network === 'mas') {
        return null;
    }

    // UserId for IRC user is created on the fly. This method therefore never returns null if
    // network is not mas
    return UserGId.create({
        type: 'irc',
        id: new Buffer(nick).toString('base64').replace(/=+$/, '')
    });
};

exports.updateUserNick = async function updateUserNick(user, network, nick) {
    const nwInfo = await NetworkInfo.findFirst({ userId: user.id, network });

    if (nwInfo) {
        await nwInfo.set('nick', nick);
    }
};

async function fetchUser(nick, network) {
    const nwInfo = await NetworkInfo.findFirst({ nick, network });

    if (nwInfo && nwInfo.get('state') === 'connected') {
        const user = await User.fetch(nwInfo.get('userId'));

        return !user || user.get('deleted') ? null : user;
    }

    return null;
}
