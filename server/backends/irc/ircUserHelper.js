//
//   Copyright 2015 Ilkka Oksanen <iao@iki.fi>
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
const UserGId = require('../../models/userGId');
const nicksService = require('../../services/nicks');

exports.getUserGId = async function getUserGId(nick, network) {
    const masUserId = await nicksService.getUserFromNick(nick, network);

    if (masUserId) {
        return masUserId.gId;
    }

    // UserId for IRC user is created on the fly if the nick in the network hasn't an ID
    // already. This method therefore never returns null.
    assert(network !== 'mas', 'MAS channel has an unknown MAS user');

    return UserGId.create({
        type: 'irc',
        id: new Buffer(`${network}!${nick}`).toString('base64').replace(/=+$/, '')
    });
};

exports.getIRCUserGIdNickAndNetwork = function getIRCUserGIdNickAndNetwork(userGId) {
    assert(userGId.type === 'irc');

    const decodedGId = new Buffer(userGId.id, 'base64').toString('ascii');
    const separatorPos = decodedGId.indexOf('!');

    return {
        network: decodedGId.substring(0, separatorPos),
        nick: decodedGId.substring(separatorPos + 1)
    };
};

