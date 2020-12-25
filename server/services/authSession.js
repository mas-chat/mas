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

const Session = require('../models/session');

exports.create = async function create(userId, ip) {
  return Session.create({ userId, ip });
};

exports.get = async function get(cookie) {
  const sessionData = decodeCookieValue(cookie);

  if (!sessionData) {
    return null;
  }

  const session = await findSession(sessionData);

  if (!session) {
    return null;
  }

  if (session.expired) {
    session.delete();
    return null;
  }

  return session;
};

exports.deleteAll = async function deleteAll(userId) {
  const sessions = await Session.find({ userId });

  sessions.forEach(session => session.delete());
};

function decodeCookieValue(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('ascii'));
  } catch (e) {
    return null;
  }
}

async function findSession({ userId, token } = {}) {
  if (!userId || !token) {
    return null;
  }

  const sessions = await Session.find({ userId });

  return sessions.find(userSession => userSession.get('token') === token);
}
