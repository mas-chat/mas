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

exports.updateCurrentNick = function*(userId, network, nick) {
    yield removeCurrentNickFromIndex(userId, network);

    yield redis.hset(`networks:${userId}:${network}`, 'currentnick', nick);
    yield redis.hset('index:currentnick', network + ':' + nick.toLowerCase(), userId);
};

exports.removeCurrentNick = function*(userId, network) {
    yield removeCurrentNickFromIndex(userId, network);
    yield redis.hset(`networks:${userId}:${network}`, 'currentnick', '');
};

exports.getUserIdFromNick = function*(nick, network) {
    return yield redis.hget('index:currentnick', network + ':' + nick.toLowerCase());
};

exports.getCurrentNick = function*(userId, network) {
    return yield getCurrentNick(userId, network);
};

function *getCurrentNick(userId, network) {
    return yield redis.hget(`networks:${userId}:${network}`, 'currentnick');
}

function *removeCurrentNickFromIndex(userId, network) {
    let oldNick = yield redis.hget(`networks:${userId}:${network}`, 'currentnick');

    if (oldNick) {
        yield redis.hdel('index:currentnick', network + ':' + oldNick);
    }
}
