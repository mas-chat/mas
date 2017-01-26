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

const Session = require('../models/session');

const ONE_WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

exports.createSession = async function createSession(user, ctx) {
    const session = await Session.create({
        userId: user.id,
        ip: ctx.request.ip
    });

    const cookieValue = new Buffer(JSON.stringify({
        token: session.get('token'),
        userId: session.get('userId')
    })).toString('base64');

    ctx.cookies.set('session', cookieValue, {
        maxAge: ONE_WEEK_IN_MS, // Same as expiration time check in Session model
        path: '/',
        httpOnly: false
    });
};
