//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
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

var winston = require('winston'),
    nconf = require('nconf').file('../config.json');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({
            filename: nconf.get('logPath') + '/mas.log',
            colorize: true
        }),
        new (winston.transports.Console)({
            colorize: true
        })
    ]
});

function Log() {
}

Log.prototype.info = function(userId, msg) {
    logEntry('info', userId, msg);
};

Log.prototype.warn = function(userId, msg) {
    logEntry('info', userId, msg);
};

Log.prototype.error = function(userId, msg) {
    logEntry('info', userId, msg);
};

function logEntry(type, userId, msg) {
    var entry = {};

    if (isNaN(userId)) {
        entry.msg = userId;
    } else {
        entry.userId = userId;
        entry.msg = msg;
    }

    logger.log(type, entry);
}

// Singleton
module.exports = new Log();
