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

const uuid = require('uid2');
const redis = require('../lib/redis').createClient();
const User = require('../models/user');
const log = require('../lib/log');
const mailer = require('../lib/mailer');
const conf = require('../lib/conf');

exports.create = async function create() {
    const email = this.request.body.email;
    const userRecord = await User.findFirst({ email: email.trim() });

    if (userRecord) {
        const token = uuid(30);
        const link = `${conf.getComputed('site_url')}/reset-password/${token}`;

        mailer.send('emails/build/resetPassword.hbs', {
            name: userRecord.get('name'),
            url: link
        }, userRecord.get('email'), 'Password reset link');

        await redis.set(`passwordresettoken:${token}`, userRecord.id);
        await redis.expire(`passwordresettoken:${token}`, 60 * 60 * 24); // 24 hours

        log.info(userRecord.id, `Password reset email sent, link is: ${link}`);
    } else {
        log.warn('Bogus password reset request received');
    }

    this.response.redirect('/forgot-password-done.html');
};
