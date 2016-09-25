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

const redis = require('../lib/redis').createClient();
const User = require('../models/user');
const settingsService = require('../services/settings');

exports.show = async function show() {
    const userId = await redis.get(`emailconfirmationtoken:${this.params.token}`);

    if (!userId) {
        this.body = 'Expired or invalid email confirmation link.';
        return;
    }

    const user = await User.fetch(parseInt(userId));
    await user.set('emailConfirmed', true);

    await settingsService.sendSet(user);

    await this.render('confirmed-email', {
        page: 'confirmed-email',
        title: 'Email confirmed'
    });
};
