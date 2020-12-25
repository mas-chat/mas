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

import redis from '../lib/redis';

const User = require('../models/user');
const settingsService = require('../services/settings');

exports.show = async function show(ctx) {
  const userId = await redis.get(`frontend:email_confirmation_token:${ctx.params.token}`);

  if (!userId) {
    ctx.body = 'Expired or invalid email confirmation link.';
    return;
  }

  const user = await User.fetch(parseInt(userId));
  await user.set('emailConfirmed', true);

  await settingsService.sendUpdateSettings(user);

  await ctx.render('confirmed-email', {
    page: 'confirmed-email',
    title: 'Email confirmed'
  });
};
