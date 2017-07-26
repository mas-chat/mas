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

const util = require('util');
const winston = require('winston');

require('colors');

function MasConsoleLogger(options) {
    winston.Transport.call(this, options);

    this.name = 'masConsoleLogger';
    this.level = options.level || 'info';
}

util.inherits(MasConsoleLogger, winston.Transport);

MasConsoleLogger.prototype.log = function log(level, msg, meta, callback) {
    const processParts = process.title.split('-');
    const processName = processParts[1];
    const processExtension = processParts[2];
    let processColumn;
    let cat;

    switch (processName) {
        case 'irc':
            processColumn = (processExtension === 'connman' ? 'ircco' : 'irc  ').green;
            break;
        case 'frontend':
            processColumn = 'front'.blue;
            break;
        case 'loopback':
            processColumn = 'loop '.yellow;
            break;
        default:
            processColumn = 'UNKWN'.red;
    }

    switch (level) {
        case 'info':
            cat = 'INFO';
            break;
        case 'warn':
            cat = 'WARN'.red;
            break;
        case 'error':
            cat = 'ERR '.red;
            break;
        default:
            cat = 'UNKN'.red;
    }

    const date = new Date().toISOString();
    const prefix = process.env.NODE_ENV === 'development'
        ? `${cat} ${meta.userId ? `[${meta.userId}] ` : ''}`
        : `${date.yellow} ${processColumn}-${cat}-${meta.userId ? `[${meta.userId}] ` : 'N/A'}: `;

    process.stdout.write(`${prefix}${msg}\n`);

    callback(null, true);
};

MasConsoleLogger.prototype.logException = function logException(msg, meta, callback) {
    const that = this;

    function onLogged() {
        that.removeListener('error', onError);
        callback();
    }

    function onError() {
        that.removeListener('logged', onLogged);
        callback();
    }

    this.once('logged', onLogged);
    this.once('error', onError);
    this.log('error', msg, meta, () => {});

    meta.stack.forEach(line => console.log(line.red)); // eslint-disable-line no-console
};

module.exports = MasConsoleLogger;
