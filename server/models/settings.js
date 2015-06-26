//
//   Copyright 2009-2015 Ilkka Oksanen <iao@iki.fi>
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

const redis = require('../lib/redis').createClient(),
      notification = require('../lib/notification');

exports.sendSet = function*(userId, sessionId) {
    let settings = yield redis.hgetall(`settings:${userId}`);
    let user = yield redis.hgetall(`user:${userId}`);

    let command = {
        id: 'SET',
        settings: {
            activeDesktop: parseInt(settings.activeDesktop),
            email: user.email,
            emailConfirmed: user.emailConfirmed === 'true'
        }
    };

    if (sessionId) {
        yield notification.send(userId, sessionId, command);
    } else {
        yield notification.broadcast(userId, command);
    }
}
