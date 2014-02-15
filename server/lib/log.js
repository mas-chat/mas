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

var path = require('path'),
    fs = require('fs'),
    winston = require('winston'),
    conf = require('./conf'),
    colors = require('colors');

require('winston-loggly');

var transports = configTransports();

var logger = new (winston.Logger)({
    transports: transports
});

exports.info = function(userId, msg) {
    logEntry('info', userId, msg);
};

exports.warn = function(userId, msg) {
    logEntry('info', userId, msg);
};

exports.error = function(userId, msg) {
    logEntry('info', userId, msg);
};

function logEntry(type, userId, msg) {
    var entry = {};
    var message;

    if (isNaN(userId)) {
        message = userId;
    } else {
        entry.userId = userId;
        message = msg;
    }

    logger.log(type, message, entry);
}

function configTransports() {
    var transports = [];

    // Always enable file logging
    var logDirectory = path.normalize(conf.get('log:directory'));

    if (!fs.existsSync(logDirectory)) {
        console.error('ERROR: '.red + 'Log directory ' + logDirectory + ' doesn\'t exist.');
        process.exit(1);
    }

    var fileTransport = new (winston.transports.File)({
        filename: path.normalize(logDirectory + '/mas.log'),
        colorize: false
    });

    transports.push(fileTransport);

    // Enable console transport based on config setting
    if (conf.get('log:console') === true) {
        var consoleTransport = new (winston.transports.Console)({
            colorize: true
        });

        transports.push(consoleTransport);
    }

    // Same for loggly.com log service
    if (conf.get('loggly:enabled') === true) {
        var logglyTransport = new (winston.transports.Loggly)({
            subdomain: conf.get('loggly:subdomain'),
            inputToken: conf.get('loggly:token'),
            auth: {
                username: conf.get('loggly:username'),
                password: conf.get('loggly:password')
            },
            json: true
        });

        transports.push(logglyTransport);
    }

    return transports;
}
