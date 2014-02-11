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

var log = require('../lib/log'),
    redis = require('../lib/redis').createClient(),
    outbox = require('../lib/outbox'),
    textLine = require('../lib/textLine');

module.exports = function *() {
    var userId = this.mas.userId;
    var sessionId = this.mas.sessionId;

    log.info(userId, 'Long poll HTTP request received');

    if (this.mas.newSession) {
        log.info(userId, 'Initializing new session');
        yield initSession(userId, sessionId);
    }

    this.body = yield outbox.flush(userId, sessionId, 25);
};

function *initSession(userId, sessionId) {
    // New session, reset outbox, send initial messages
    yield redis.run('initSession', [], [ sessionId, userId ]);
    yield textLine.sendNicks(userId);
}
