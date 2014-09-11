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

var httpStatus = require('statuses'),
    log = require('../lib/log'),
    redis = require('../lib/redis').createClient();

module.exports = function *(next) {
    var sessionId = this.mas.sessionId;
    var expectedSeqKeyName;
    var rcvdSeq = this.request.body.seq;
    var method = this.params.method;

    if (method === 'listen') {
        expectedSeqKeyName = 'listenRcvNext';
    } else if (method === 'send') {
        expectedSeqKeyName = 'sendRcvNext';
    } else {
        respond(this, 'not acceptable', 'Invalid API endpoint.');
        return;
    }

    var expectedSeq = parseInt(yield redis.hget('session:' + this.mas.userId + ':' +
        sessionId, expectedSeqKeyName));

    if (rcvdSeq === expectedSeq - 1) {
        handleResponseLost(this, method);
        return;
    } else if (rcvdSeq !== expectedSeq) {
        respond(this, 'not acceptable', 'Invalid sequence number.');
        return;
    }

    yield redis.hincrby('session:' + this.mas.userId + ':' + sessionId, expectedSeqKeyName, 1);

    yield next;
};

function handleResponseLost(ctx, method) {
    log.info(ctx.mas.userId, 'Received duplicate request, method: ' + method);

    if (method === 'send') {
        // Client hasn't received the previous send req response. Just send OK back again.
        respond(ctx, 'no content');
    } else {
        // Re-send the previous reply
        ctx.mas.replay = true;
    }
}

function respond(ctx, code, msg) {
    log.info(ctx.mas.userId, 'Sequence number error, code: ' + code);

    ctx.status = httpStatus(code);

    if (msg) {
        ctx.body = msg;
    }
}
