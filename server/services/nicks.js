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

const NetworkInfo = require('../models/networkInfo');
const User = require('../models/user');

// User's master nick is stored in 'nick' property in user model. User's nicks in
// networks are stored in 'nick' property in networkInfo model. Currently master nick
// always equals to MAS nick and can differ in IRC network

exports.getCurrentNick = async function getCurrentNick(user, network) {
    const nwInfo = await NetworkInfo.findFirst({ userId: user.id, network });

    return nwInfo ? nwInfo.get('nick') : null;
};

exports.updateCurrentNick = async function updateCurrentNick(user, network, nick) {
    const nwInfo = await NetworkInfo.findFirst({ userId: user.id, network });

    if (nwInfo) {
        await nwInfo.set('nick', nick);
    }
};

exports.getUserFromNick = async function getUserFromNick(nick, network) {
    const nwInfo = await NetworkInfo.findFirst({ nick, network });

    if (nwInfo) {
        const user = await User.fetch(nwInfo.get('userId'));

        return !user || user.get('deleted') ? null : user;
    }

    return null;
};
