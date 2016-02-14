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

const Settings = require('../models/settings'),
      notification = require('../lib/notification');

exports.sendSet = function*(userRecord, sessionId) {
    let settingsRecord = yield Settings.findOrCreate(userRecord.id);

    let command = {
        id: 'SET',
        settings: {
            activeDesktop: settingsRecord.get('activeDesktop'),
            theme: settingsRecord.get('theme'),
            email: userRecord.get('email'),
            emailConfirmed: userRecord.get('emailConfirmed')
        }
    };

    if (sessionId) {
        yield notification.send(userRecord.id, sessionId, command);
    } else {
        yield notification.broadcast(userRecord.id, command);
    }
};
