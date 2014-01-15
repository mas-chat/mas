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

var auth = require('../lib/authentication');

module.exports = function *(next) {
    var verdict = yield auth.authenticateUser(this.cookies.get('ProjectEvergreen'));

    if (!verdict.userId) {
        this.status = verdict.status;
        return;
    }

    var expectedListenSeq = yield Q.nsend(r, 'hget', 'user:' + userId, "listenSeq");
    var rcvdListenSeq = this.params.listenSeq;

    if (rcvdListenSeq !== 0 && rcvdListenSeq === expectedListenSeq - 1) {
        // TBD: Re-send the previous reply
        return;
    } else if (rcvdListenSeq !== 0 && rcvdListenSeq !== expectedListenSeq) {
        // No way to recover
        this.status = 'not acceptable';
        return;
    }

    // Request is considered valid
    yield Q.nsend(r, 'hincrby', 'user:' + userId, 'listenSeq', 1);

    yield processRequest(rcvdListenSeq);
}

function *processRequest(rcvdListenSeq) {
    if (rcvdListenSeq === '0') {
        // New session, reset session variables
        var update = {
            "sendRcvNext": 1,
            "listenRcvNext": 1
            "sessionId": Math.floor((Math.random() * 10000000) + 1);
        };

        yield Q.nsend(r, 'hmset', 'user:' + userId, update);

        queueMsg('A', null)

        flushQueue();
    }

    this.status = 304;
};
