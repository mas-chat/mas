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

const assert = require('assert'),
      uid2 = require('uid2'),
      redisModule = require('./redis'),
      sendRedis = redisModule.createClient(),
      rcvRedis = redisModule.createClient(),
      co = require('co'),
      log = require('./log');

let shutdownInitiated = false;
let processing = false;

exports.createEndPoint = function(name) {
    return new Courier(name);
};

exports.shutdown = function() {
    if (!processing) {
        exit();
    } else {
        shutdownInitiated = true;
    }
};

function Courier(name) {
    this.name = name;
    this.handlers = {};

    log.info('Courier: New instance created.');
}

Courier.prototype.start = function() {
    co(function*() {
        while (1) {
            let result = (yield rcvRedis.brpop(`inbox:${this.name}`, 0))[1];

            processing = true;

            let msg = JSON.parse(result);
            let handler = this.handlers[msg.__type];

            log.info(`Courier: MSG RCVD [${msg.__sender} → ${this.name}] DATA: ${result}`);

            assert(handler, this.name + ': Missing message handler for: ' + msg.__type);

            if (isGeneratorFunction(handler)) {
                /*jshint -W083 */
                co(function*() {
                    this._reply(msg, (yield handler(msg)));
                }).call(this);
            } else {
                this._reply(msg, handler(msg));
            }

            processing = false;

            if (shutdownInitiated) {
                exit();
            }
        }
    }).call(this);
};

Courier.prototype.call = function*(dest, type, params) {
    let uid = Date.now() + uid2(10);
    let data = this._convertToString(type, params, uid);
    let reqRedis = redisModule.createClient();

    yield reqRedis.lpush(`inbox:${dest}`, data);
    let resp = yield reqRedis.brpop(`inbox:${this.name}:${uid}`, 60);
    yield reqRedis.quit();

    if (resp === null) {
        log.warn('Courier: No reply received from ' + dest);
    }

    resp = resp ? JSON.parse(resp[1]) : {};
    delete resp.__sender;

    return resp;
};

Courier.prototype.callNoWait = function(dest, type, params) {
    let data = this._convertToString(type, params);

    co(function*() {
        yield sendRedis.lpush(`inbox:${dest}`, data);
    })();
};

Courier.prototype.clearInbox = function*(name) {
    yield sendRedis.del(`inbox:${name}`);
};

Courier.prototype.on = function(type, callback) {
    this.handlers[type] = callback;
};

Courier.prototype.noop = function() {
    return null;
};

Courier.prototype._reply = function(msg, resp) {
    if (!msg.__uid) {
        // Not a request.
        return;
    }

    assert(resp);

    this.callNoWait(`${msg.__sender}:${msg.__uid}`, null, resp);
};

Courier.prototype._convertToString = function(type, params, uid) {
    let msg = params || {};

    msg.__sender = this.name;

    if (type) {
        msg.__type = type;
    }

    if (uid) {
        msg.__uid = uid;
    }

    return JSON.stringify(msg);
};

function isGeneratorFunction(obj) {
    return obj && obj.constructor && obj.constructor.name === 'GeneratorFunction';
}

function exit() {
    log.info('Courier: Courier ready. Exiting.');
    process.exit(0);
}
