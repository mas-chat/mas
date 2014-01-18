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

var wrapper = require('co-redis'),
    redis = wrapper(require('redis').createClient());

module.exports = function *(next) {
    var expectedSeqKeyName;
    var rcvdSeq;

    w.info('Validating sequence number.');

    if (this.params.listenSeq) {
        rcvdSeq = parseInt(this.params.listenSeq);
        expectedSeqKeyName = 'listenRcvNext';
    } else if (this.params.sendSeq) {
        rcvdSeq = parseInt(this.params.sendSeq);
        expectedSeqKeyName = 'sendRcvNext';
    } else {
        respond(this, 'not acceptable', 'Invalid sequence number.');
        return;
    }

    var expectedSeq = parseInt(yield redis.hget('user:' + this.mas.userId, expectedSeqKeyName));

    if (this.mas.newSession) {
        // New session, reset sequence numbers.
        var update = {
            "sendRcvNext": 0,
            "listenRcvNext": 0,
        };

        yield redis.hmset('user:' + this.mas.userId, update);
    } else if (rcvdSeq === expectedSeq - 1) {
        // TBD: Re-send the previous reply
        respond(this, 'not acceptable',
            'Previous response lost. Resend logic to be implemented.');
        return;
    } else if (rcvdSeq !== expectedSeq) {
        respond(this, 'not acceptable', 'Invalid sequence number.');
        return;
    }

    yield redis.hincrby('user:' + this.mas.userId, expectedSeqKeyName, 1);

    yield next;
}

function respond(ctx, code, msg) {
    ctx.status = code;
    ctx.body = msg;
}