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

import UserGId from './userGId';

const log = require('./log');
const conf = require('./conf');
const User = require('../models/user');
const nicksService = require('../services/nicks');
const notification = require('./notification');

const networks = ['mas', ...Object.keys(conf.get('irc:networks'))];

exports.introduce = async function introduce(user, userGId, session) {
  await introduceUsers(user, [userGId], session, null);
};

exports.scanAndIntroduce = async function scanAndIntroduce(user, msg, session, socket) {
  await introduceUsers(user, scanUserGIds(msg), session, socket);
};

async function introduceUsers(user, userGIds, session, socket) {
  if (session) {
    // If no session is given, force broadcast userGids without remembering them
    session.knownUserGIds = session.knownUserGIds || {};
  }

  const newUsers = {};

  for (const userGId of userGIds) {
    if (!session || !session.knownUserGIds[userGId.toString()]) {
      if (session) {
        session.knownUserGIds[userGId.toString()] = true;
      }

      const entry = { nick: {} };

      if (userGId.isMASUser) {
        const foundUser = await User.fetch(userGId.id);

        if (!foundUser) {
          log.warn(`User missing: ${userGId.id}`);
          entry.name = 'UNKNOWN';
          entry.gravatar = '';

          for (const network of networks) {
            entry.nick[network] = 'UNKNOWN';
          }
        } else {
          entry.name = foundUser.get('name');
          entry.gravatar = foundUser.get('emailMD5');

          for (const network of networks) {
            const currentNick = await nicksService.getNick(foundUser.gId, network);

            // Fallback to default nick. This solves the situation where the user joins
            // a new IRC network during the session. In that case his own userGId is in
            // knownUserGIds table but with null nick for that IRC network. Fallback
            // works because if the user's nick changes for any reason from the default,
            // that is communicated separately to the client.
            entry.nick[network] = currentNick || foundUser.get('nick');
          }
        }
      } else {
        entry.name = 'IRC User';
        entry.gravatar = '';

        for (const network of networks) {
          entry.nick[network] = await nicksService.getNick(userGId, network);
        }
      }

      newUsers[userGId] = entry;
    }
  }

  if (Object.keys(newUsers).length > 0) {
    const ntf = {
      type: 'ADD_USERS',
      mapping: newUsers
    };

    log.info(user, `Emitted ADD_USERS ${JSON.stringify(ntf)}`);

    if (socket) {
      socket.emit('ntf', ntf);
    } else if (session) {
      await notification.send(user, session.id, ntf);
    } else {
      await notification.broadcast(user, ntf);
    }
  }
}

function scanUserGIds(msg) {
  return Object.keys(scan(msg))
    .map(userGIdString => UserGId.create(userGIdString))
    .filter(userGId => userGId && userGId.valid);
}

function scan(msg) {
  const res = {};

  Object.keys(msg).forEach(key => {
    const value = msg[key];

    if (typeof value === 'object' && value !== null) {
      Object.assign(res, scan(value));
    } else if (key === 'userId' && value) {
      res[value] = true;
    }
  });

  return res;
}
