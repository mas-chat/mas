//
//   Copyright 2016 Ilkka Oksanen <iao@iki.fi>
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

const User = require('../models/user');
const NetworkInfo = require('../models/networkInfo');
const Settings = require('../models/settings');
const log = require('../lib/log');

// TODO: Send password update mail here?

exports.addUser = async function addUser(details, { skipSetters = false } = {}) {
  const user = await User.create(details, { skipSetters });

  if (user.valid) {
    await Settings.create({ userId: user.id });
  } else {
    log.warn(`User creation failed, errors: ${JSON.stringify(user.errors)}`);
  }

  return user;
};

exports.addMASNetworkInfo = async function addMASNetworkInfo(user) {
  await NetworkInfo.create({
    userId: user.id,
    network: 'mas',
    state: 'connected',
    nick: user.get('nick')
  });
};
