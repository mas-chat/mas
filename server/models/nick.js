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

const redis = require('../lib/redis').createClient();

// User's nick in MAS network is stored 'nick' property in user:<userId> hash. User's nicks in
// other networks are stored in 'currentnick' property in networks:<userId>:<network> hash.
// These two locations have their own indices. In the future, nick in MAS network could be
// be stored also in networks:<userId>:MAS?

exports.updateCurrentNick = async function(userId, network, nick) {
    await removeCurrentNickFromIndex(userId, network);

    await redis.hset(`networks:${userId}:${network}`, 'currentnick', nick);
    await redis.hset('index:currentnick', network + ':' + nick.toLowerCase(), userId);
};

exports.removeCurrentNick = async function(userId, network) {
    await removeCurrentNickFromIndex(userId, network);

    // Don't remove or modify currentnick of networks:<userId>:<network> here as the now stale
    // nick is still needed for USERS command when old discussions are shown.
};

exports.getUserIdFromNick = async function(nick, network) {
    if (network === 'MAS') {
        let userId = await redis.hget('index:user', nick);

        if (userId) {
            return (await redis.hget(`user:${userId}`, 'deleted')) === 'true' ? null : userId;
        } else {
            return null;
        }
    } else {
        return await redis.hget('index:currentnick', network + ':' + nick.toLowerCase());
    }
};

exports.getCurrentNick = async function(userId, network) {
    if (network === 'MAS') {
        return await redis.hget(`user:${userId}`, 'nick');
    } else {
        return await redis.hget(`networks:${userId}:${network}`, 'currentnick');
    }
};

async function removeCurrentNickFromIndex(userId, network) {
    let oldNick = await redis.hget(`networks:${userId}:${network}`, 'currentnick');

    if (oldNick) {
        await redis.hdel('index:currentnick', network + ':' + oldNick.toLowerCase());
    }
}
