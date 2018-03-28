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

const assert = require('assert');
const util = require('util');
const redis = require('./redis');

exports.send = async function send(user, sessionId, ntfs) {
  await sendNotifications(user, sessionId, null, ntfs);
};

exports.broadcast = async function broadcast(user, ntfs, excludeSessionId) {
  await sendNotifications(user, null, excludeSessionId, ntfs);
};

async function sendNotifications(user, sessionId, excludeSessionId, ntfs) {
  assert(ntfs);

  const ntfsArray = (util.isArray(ntfs) ? ntfs : [ntfs]).map(
    ntf => (typeof ntf === 'string' ? ntf : JSON.stringify(ntf))
  );

  for (const ntf of ntfsArray) {
    if (sessionId) {
      redis.publish(`${user.id}:${sessionId}`, JSON.stringify({ type: 'ntf', msg: ntf }));
    } else if (!excludeSessionId) {
      redis.publish(user.id, JSON.stringify({ type: 'ntf', msg: ntf }));
    } else {
      const subcriptions = await redis.pubsub('CHANNELS', `${user.id}:*`);

      for (const subscription of subcriptions) {
        if (subscription !== `${user.id}:${excludeSessionId}`) {
          redis.publish(subscription, JSON.stringify({ type: 'ntf', msg: ntf }));
        }
      }
    }
  }
}
