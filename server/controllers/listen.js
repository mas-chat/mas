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

var log = require('../../lib/log'),
    wrapper = require('co-redis'),
    redis = wrapper(require('redis').createClient()),
    outbox = require('../lib/outbox.js');

module.exports = function *() {
    var userId = this.mas.userId;
    var sessionId = this.mas.sessionId;

    log.info(userId, 'Long poll HTTP request received');

    if (this.mas.newSession) {
        yield initSession(userId, sessionId);
    }

    this.body = yield outbox.flush(userId, 25);
};

function *initSession(userId, sessionId) {
    // New session, reset outbox
    var commands = [];

    yield outbox.reset(userId);

    commands.push({
        id: 'SESSIONID',
        sessionId: sessionId
    }, {
        id: 'SET',
        settings: {}
    });

    //Iterate through windows
    var windows = yield redis.smembers('windowlist:' + userId);

    for (var i = 0; i < windows.length; i++) {
        var details = windows[i].split(':');
        var windowId = details[0];
        var network = details[1];
        var windowName = details[2];

        var window = yield redis.hgetall('window:' + userId + ':' + windowId);

        commands.push({
            id: 'CREATE',
            windowId: windowId,
            x: parseInt(window.x),
            y: parseInt(window.y),
            width: parseInt(window.width),
            height: parseInt(window.height),
            network: network, // TBD This is now string not number! Fix client and docs!
            chanName: windowName,
            type: window.type,
            sounds: 1, // TBD
            titlealert: 1, //TBD
            userMode: 2, //TBD
            visible: 1, // TBD
            newMsgs: 2, // TBD
            password: window.password,
            topic: 'Hello' // TBD
        });

        var lines = yield redis.lrange('windowmsgs:' + userId + ':' + windowId, 0, -1);

        for (var ii = lines.length - 1; ii >= 0; ii--) {
            commands.push(lines[ii]);
        }
    }

    commands.push({
        id: 'INITDONE'
    });

    yield outbox.queue(userId, commands);
}
