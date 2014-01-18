//
//   Copyright 2013 Ilkka Oksanen <iao@iki.fi>
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

var Q = require('q'),
    wrapper = require('co-redis'),
    redis = wrapper(require('redis').createClient()),
    plainRedis = require('redis'),
    outbox = require('../lib/outbox.js');

module.exports = function *(next) {
    var userId = this.mas.userId;
    var sessionId = this.mas.sessionId;

    w.info('[' + userId + '] Long poll received');

    if (this.mas.newSession) {
        yield initSession(userId, sessionId);
    }

    if ((yield outbox.length(userId)) === 0) {
        var deferred = Q.defer();
        var pubSubClient = plainRedis.createClient();

        var timer = setTimeout(function() {
            deferred.resolve();
        }, 25000);

        pubSubClient.on("message", function (channel, message) {
            clearTimeout(timer);
            deferred.resolve();
        });
        pubSubClient.subscribe("useroutbox:" + userId);

        // This is after subscribe to avoid race condition
        if ((yield outbox.length(userId)) === 0) {
            yield deferred.promise;
        }

        pubSubClient.unsubscribe();
        pubSubClient.end();
    }

    this.body = yield outbox.flush(userId);
}

function *initSession(userId, sessionId) {
    // New session, reset outbox
    yield outbox.reset(userId);

    yield outbox.queue(userId, {
        id: "SESSIONID",
        sessionId: sessionId
    }, {
        id: "SET",
        settings: {}
    });

    //Iterate through windows
    var windows = yield redis.smembers('windowlist:' + userId);

    for (var i = 0; i < windows.length; i++) {
        var details = windows[i].split(':');
        var windowId = details[0];
        var networkId = details[1];
        var windowName = details[2];

        var window = yield redis.hgetall('window:' + userId + ':' + windowId);

        yield outbox.queue(userId, {
            id: "CREATE",
            window: windowId,
            x: parseInt(window.x),
            y: parseInt(window.y),
            width: parseInt(window.width),
            height: parseInt(window.height),
            nwName: "", // TBD
            nwId: networkId,
            chanName: windowName,
            chanType: parseInt(window.type),
            sounds: 1, // TBD
            titlealert: 1, //TBD
            userMode: 2, //TBD
            visible: 1, // TBD
            newMsgs: 2, // TBD
            password: window.password,
            topic: "Hello" // TBD
        });
    }
}
