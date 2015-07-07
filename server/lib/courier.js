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
      rcvRedis = redisModule.createClient(),
      sendRedis = redisModule.createClient(),
      co = require('co'),
      log = require('./log');

let quitPending = false;
let processing = false;

exports.create = function() {
    // Can only send messages and receive replies. Doesn't have a well known endpoint name.
    return new Courier();
};

exports.createEndPoint = function(name) {
    return new Courier(name);
};

function Courier(name) {
    this.name = name || uid2(32);
    this.handlers = {};
    this.isEndpoint = !!name;

    log.info('Courier: New instance created.');
}

Courier.prototype.listen = function*() {
    assert(this.isEndpoint);

    while (1) {
        let result = (yield rcvRedis.brpop(`inbox:${this.name}`, 0))[1];

        processing = true;

        let msg = JSON.parse(result);
        let handler = this.handlers[msg.__type];

        log.info(`Courier: MSG RCVD [${msg.__sender} → ${this.name}] DATA: ${result}`);

        assert(handler, this.name + ': Missing message handler for: ' + msg.__type);

        if (isGeneratorFunction(handler)) {
            co(function*() { // eslint-disable-line no-loop-func
                this._reply(msg, (yield handler(msg)));
            }).call(this);
        } else {
            this._reply(msg, handler(msg));
        }

        if (quitPending) {
            break;
        }

        processing = false;
    }
};

Courier.prototype.call = function*(dest, type, params) {
    assert(!quitPending && this.isEndpoint);

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

Courier.prototype.callNoWait = function(dest, type, params, ttl) {
    assert(!quitPending);

    let data = this._convertToString(type, params);
    let key = `inbox:${dest}`;

    co(function*() {
        yield sendRedis.lpush(key, data);

        if (ttl) {
            yield sendRedis.expire(key, ttl);
        }
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

Courier.prototype.quit = function() {
    quitPending = true;

    if (!processing) {
        // If we aren't processing a received message we can quit immediately
        cleanUp();
    }
}

Courier.prototype._reply = function(msg, resp) {
    if (!msg.__uid) {
        // Not a request.
        return;
    }

    assert(resp);

    // It might have taken the target too much time to respond. It's therefore possible that the
    // sender is not waiting anymore. Use TTL 60s to guarantee cleanup in that case.
    this.callNoWait(`${msg.__sender}:${msg.__uid}`, null, resp, 60);

    if (quitPending) {
        // Quit() has been called but we were middle of procesing a message, quit now.
        cleanup();
    }
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

function cleanUp() {
    sendRedis.quit();
    rcvRedis.quit();
}

function isGeneratorFunction(obj) {
    return obj && obj.constructor && obj.constructor.name === 'GeneratorFunction';
}
