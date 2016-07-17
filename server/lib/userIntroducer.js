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

const UserGId = require('../models/UserGId'),
      log = require('./log'),
      conf = require('./conf'),
      User = require('../models/user'),
      nicksService = require('../services/nicks'),
      redis = require('./redis').createClient();

const networks = [ 'MAS', ...Object.keys(conf.get('irc:networks')) ];

exports.introduce = async function(session, socket, userGId) {
    await introduceUsers(session, socket, [ userGId ]);
}

exports.scanAndIntroduce = async function(session, socket, msg) {
    await introduceUsers(session, socket, scanUserGIds(msg));
};

async function introduceUsers(session, socket, userGIds) {
    session.knownUserGIds = session.knownUserGIds || {};

    const newUsers = {};

    for (const userGId of userGIds) {
        if (!session.knownUserGIds[userGId.toString()]) {
            session.knownUserGIds[userGId.toString()] = true;

            const entry = { nick: {} };

            if (userGId.isMASUser()) {
                const user = await User.fetch(userGId.id);

                entry.name = user.get('name');
                entry.gravatar = user.get('emailMD5');

                for (const network of networks) {
                    entry.nick[network] = await nicksService.getCurrentNick(user, network);
                }
            } else {
                entry.name = 'IRC User';
                entry.gravatar = '';

                const nick = await redis.hget(`ircuser:${userGId}`, 'nick');

                for (const network of networks) {
                    entry.nick[network] = nick // This is a shortcut, ircUserId is scoped by network
                }
            }

            newUsers[userGId] = entry;
        }
    }

    if (Object.keys(newUsers).length > 0) {
        const ntf = {
            id: 'USERS',
            mapping: newUsers
        };

        log.info(session.user, `Emitted USERS (sessionId: ${session.id}) ${JSON.stringify(ntf)}`);

        socket.emit('ntf', ntf);
    }
}

function scanUserGIds(msg) {
    return Object.keys(scan(msg))
      .map(userGIdString => UserGId.create(userGIdString))
      .filter(userGId => userGId && userGId.valid);
}

function scan(msg) {
    let res = {};

    for (const key in msg) {
        let value = msg[key];

        if (typeof value === 'object') {
            Object.assign(res, scan(value));
        } else if (key === 'userId' && value) {
            res[value] = true;
        }
    }

    return res;
}
