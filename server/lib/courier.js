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

var assert = require('assert'),
    wrapper = require('co-redis'),
    sendRedis = wrapper(require('redis').createClient()),
    rcvRedis = wrapper(require('redis').createClient()),
    co = require('co'),
    log = require('./log');

exports.createEndPoint = function(name) {
    return new Courier(name);
};

function Courier(name) {
    this.name = name;
    this.handlers = {};

    log.info('New Courier instance created.');
}

Courier.prototype.start = function () {
    co(function *() {
        while (1) {
            var result = yield rcvRedis.brpop('inbox:' + this.name, 0);
            var msg = JSON.parse(result[1]);
            var handler = this.handlers[msg.type];
            log.info('MSG RCVD [' + msg.__sender + ' -> ' + this.name + '] DATA: ' + result[1]);

            assert(handler, this.name + ': Missing message handler for: ' + msg.type);

            if (isGeneratorFunction(handler)) {
                yield handler(msg);
            } else {
                // Normal function
                handler(msg);
            }
        }
    }).call(this);
};

Courier.prototype.send = function *(dest, msg) {
    var data = convert(msg, this.name, dest);
    yield sendRedis.lpush('inbox:' + dest, data);
};

Courier.prototype.sendNoWait = function(dest, msg) {
    co(this.send).call(this, dest, msg);
};

Courier.prototype.on = function(type, callback) {
    this.handlers[type] = callback;
};

function convert(msg, sender, dest) {
    if (typeof msg === 'string') {
        msg = { type: msg };
    }
    msg.__sender = sender;
    msg = JSON.stringify(msg);

    log.info('MSG SENT [' + sender + ' -> ' + dest + '] DATA:' + msg);
    return msg;
}

function isGeneratorFunction(obj) {
  return obj && obj.constructor && obj.constructor.name === 'GeneratorFunction';
}
