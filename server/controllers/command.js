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

var parse = require('co-body'),
    log = require('../lib/log'),
    redis = require('../lib/redis').createClient(),
    courier = require('../lib/courier').createEndPoint('command'),
    textLine = require('../lib/textLine'),
    windowHelper = require('../lib/windows');

module.exports = function *() {
    var userId = this.mas.userId;
    var sessionId = this.mas.sessionId;
    var body = yield parse.json(this.req);
    var command = body.command;
    var windowId = parseInt(body.windowId);

    log.info(userId, 'Prosessing command: ' + command);

    switch (command) {
        case 'SEND':
            // TBD Check that windowId is valid
            yield courier.send('ircparser', {
                type: 'send',
                userId: userId,
                windowId: windowId,
                text: body.text
            });

            var network = yield windowHelper.getWindowNameAndNetwork(userId, windowId);
            var nick = yield redis.hget('user:' + userId, 'currentNick:' + network[1]);

            yield textLine.sendByWindowId(userId, windowId, {
                nick: nick,
                cat: 'mymsg',
                body: body.text
            }, sessionId);
            break;
    }

    // TBD: Add lookup table for commands

    var resp = {
        status: 'OK'
    };

    this.body = resp;

};