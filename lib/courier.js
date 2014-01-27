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

var assert = require('assert'),
    plainRedis = require('redis').createClient(),
    wrapper = require('co-redis'),
    redis = wrapper(require('redis').createClient()),
    co = require('co');

exports.createEndPoint = function(name) {
    return new Courier(name);
};

function Courier(name) {
    this.name = name;
    this.handlers = {};

    co(function *() {
        while (1) {
            var result = yield redis.brpop('inbox:' + this.name, 0);
            var msg = JSON.parse(result[1]);
            var handler = this.handlers[msg.type];
            console.log('MSG RCVD [' + msg.__sender + ' -> ' + this.name + '] DATA: ' + result[1]);

            assert(handler, this.name + ': Missing message handler for: ' + msg.type);
            yield handler(msg);
        }
    }).call(this);
}

Courier.prototype.send = function *(dest, msg) {
    var data = convert(msg, this.name, dest);
    yield redis.lpush('inbox:' + dest, data);
};

Courier.prototype.sendNoWait = function(dest, msg) {
    var data = convert(msg, this.name, dest);
    plainRedis.lpush('inbox:' + dest, data);
};

Courier.prototype.on = function(type, callback) {
    this.handlers[type] = callback;
}

function convert(msg, sender, dest) {
    if (typeof msg === 'string') {
        msg = { type: msg }
    }
    msg.__sender = dest;
    msg = JSON.stringify(msg);

    console.log('MSG SENT [' + sender + ' -> ' + dest + '] DATA:' + msg);
    return msg;
}
