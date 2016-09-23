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

'use strict';

const path = require('path');
const fs = require('fs');
const winston = require('winston');
const MasTransport = require('./winstonMasTransport');
const DailyRotateFile = require('winston-daily-rotate-file');
const init = require('./init');
const conf = require('./conf');

require('colors');
require('winston-papertrail');

const logger = new (winston.Logger)({
    transports: configTransports()
});

exports.info = function info(user, msg) {
    logEntry('info', user, msg, () => {});
};

exports.warn = function warn(user, msg) {
    logEntry('warn', user, msg, () => {
        if (conf.get('common:dev_mode')) {
            init.shutdown();
        }
    });
};

exports.error = function error(user, msg) {
    logEntry('error', user, msg, () => {
        init.shutdown();
    });
};

exports.quit = function quit() {
    if (logger) {
        logger.clear();
    }
};

function logEntry(type, user, msg, callback) {
    // msg is an optional parameter
    logger.log(type, (user && msg) ? `[u: ${user.id}] ${msg}` : user, null, callback);
}

function configTransports() {
    const transports = [];

    if (conf.get('log:file')) {
        let logDirectory = path.normalize(conf.get('log:directory'));

        if (logDirectory.charAt(0) !== path.sep) {
            logDirectory = path.join(__dirname, '..', '..', logDirectory);
        }

        const fileName = path.join(logDirectory, `${process.title}.log`);

        if (!fs.existsSync(logDirectory)) {
            console.error( // eslint-disable-line no-console
                `${'ERROR:'.red} Log directory ${logDirectory} doesn\'t exist.`);
            process.exit(1);
        }

        if (conf.get('log:clear_at_startup') && fs.existsSync(fileName)) {
            fs.unlinkSync(fileName);
        }

        const fileTransportOptions = {
            filename: fileName,
            colorize: false,
            handleExceptions: true
        };

        const fileTransport = conf.get('log:rotate_daily') ?
            new DailyRotateFile(fileTransportOptions) :
            new (winston.transports.File)(fileTransportOptions);

        transports.push(fileTransport);
    }

    if (conf.get('log:console')) {
        const consoleTransport = new (MasTransport)({
            handleExceptions: true
        });

        transports.push(consoleTransport);
    }

    if (conf.get('papertrail:enabled')) {
        const papertrailTransport = new winston.transports.Papertrail({
            host: conf.get('papertrail:host'),
            port: conf.get('papertrail:port'),
            level: conf.get('papertrail:level'),
            hostname: 'mas',
            program: process.title,
            logFormat: (level, message) => `[${level}] ${message}`
        });

        transports.push(papertrailTransport);
    }

    return transports;
}
