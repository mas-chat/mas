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

const assert = require('assert');
const uid2 = require('uid2');
const redisModule = require('./redis');
const log = require('./log');

const rcvRedis = redisModule.createClient();
const sendRedis = redisModule.createClient();

let processing = false;
let resolveQuit = null;

exports.create = function create() {
    // Can only send messages and receive replies. Doesn't have a well known endpoint name.
    return new Courier();
};

exports.createEndPoint = function createEndPoint(name) {
    return new Courier(name);
};

function Courier(name) {
    this.name = name || uid2(32);
    this.handlers = {};
    this.isEndpoint = !!name;

    log.info('Courier: New instance created.');
}

Courier.prototype.listen = async function listen() {
    assert(this.isEndpoint);

    for (;;) {
        const result = (await rcvRedis.brpop(`inbox:${this.name}`, 0))[1];

        processing = true;

        const msg = JSON.parse(result);
        const handler = this.handlers[msg.__type];

        log.info(`Courier: MSG RCVD [${msg.__sender} → ${this.name}] DATA: ${result}`);

        assert(handler, `${this.name}: Missing message handler for: ${msg.__type}`);

        try {
            await this._reply(msg, await handler(msg));
        } catch (e) {
            log.warn(`Exception: ${e}, stack: ${e.stack.replace(/\n/g, ',')}`);
        }

        if (resolveQuit) {
            resolveQuit();
            break;
        }

        processing = false;
    }
};

Courier.prototype.call = async function call(dest, type, params) {
    if (resolveQuit) {
        log.warn('Not delivering message, shutdown is in progress.');
        return null;
    }

    const uid = Date.now() + uid2(10);
    const data = this._convertToString(type, params, uid);
    const reqRedis = redisModule.createClient();

    await reqRedis.lpush(`inbox:${dest}`, data);

    let resp = await reqRedis.brpop(`inbox:${this.name}:${uid}`, 60);
    await reqRedis.quit();

    if (resp === null) {
        log.warn(`Courier: No reply received from ${dest}`);
    }

    resp = resp ? JSON.parse(resp[1]) : {};
    delete resp.__sender;

    return resp;
};

Courier.prototype.callNoWait = async function callNoWait(dest, type, params, ttl) {
    if (resolveQuit) {
        log.warn('Not delivering message, shutdown is in progress.');
        return;
    }

    const data = this._convertToString(type, params);
    const key = `inbox:${dest}`;

    await sendRedis.lpush(key, data);

    if (ttl) {
        await sendRedis.expire(key, ttl);
    }
};

Courier.prototype.clearInbox = async function clearInbox(name) {
    await sendRedis.del(`inbox:${name}`);
};

Courier.prototype.on = function on(type, callback) {
    this.handlers[type] = callback;
};

Courier.prototype.noop = function noop() {
    return null;
};

Courier.prototype.quit = function quit() {
    log.info('Closing courier instance.');

    return new Promise(resolve => {
        if (!processing) {
            resolve();
        } else {
            resolveQuit = resolve;
        }
    });
};

Courier.prototype._reply = function _reply(msg, resp) {
    if (!msg.__uid) {
        // Not a request.
        return;
    }

    assert(resp);

    // It might have taken the target too much time to respond. It's therefore possible that the
    // sender is not waiting anymore. Use TTL 60s to guarantee cleanup in that case.
    this.callNoWait(`${msg.__sender}:${msg.__uid}`, null, resp, 60);
};

Courier.prototype._convertToString = function _convertToString(type, params, uid) {
    const msg = params || {};

    msg.__sender = this.name;

    if (type) {
        msg.__type = type;
    }

    if (uid) {
        msg.__uid = uid;
    }

    return JSON.stringify(msg);
};
