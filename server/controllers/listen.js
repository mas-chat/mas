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

var redis = require('redis'),
    r = redis.createClient(),
    Q = require('q'),
    auth = require('../lib/authentication'),
    outbox = require('../lib/outbox.js');

module.exports = function *(next) {
    var verdict = yield auth.authenticateUser(this.cookies.get('ProjectEvergreen'),
                      parseInt(this.params.sessionId));

    if (!verdict.userId) {
        this.status = verdict.status;
        return;
    }

    var userId = verdict.userId;
    var expectedListenSeq = parseInt(yield Q.nsend(r, 'hget', 'user:' + userId, "listenRcvNext"));
    var rcvdListenSeq = parseInt(this.params.listenSeq);

    if (rcvdListenSeq !== 0 && rcvdListenSeq === expectedListenSeq - 1) {
        // TBD: Re-send the previous reply
        return;
    } else if (rcvdListenSeq !== 0 && rcvdListenSeq !== expectedListenSeq) {
        // No way to recover
        this.status = 'not acceptable';
        return;
    }

    // Request is considered valid
    yield Q.nsend(r, 'hincrby', 'user:' + userId, 'listenRcvNext', 1);
    w.info('[' + userId + '] Long poll received');

    if (rcvdListenSeq === 0) {
        yield initSession(userId, rcvdListenSeq);
    }

    if ((yield outbox.length(userId)) === 0) {
        var deferred = Q.defer();
        var pubSubClient = redis.createClient();

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

function *initSession(userId, rcvdListenSeq) {
    // New session, reset session variables
    var update = {
        "sendRcvNext": 1,
        "listenRcvNext": 1,
        "sessionId": Math.floor((Math.random() * 10000000) + 1)
    };

    yield Q.nsend(r, 'hmset', 'user:' + userId, update);

    // Reset outbox
    yield outbox.reset(userId);

    yield outbox.queue(userId, {
        id: "SESSIONID",
        sessionId: update.sessionId
    });
}
