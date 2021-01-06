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

import path from 'path';
import fs from 'fs';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import MasTransport from './winstonMasTransport';
import { shutdown } from './init';
import { get, root } from './conf';

import 'colors';
import 'winston-syslog';

let logger = null;

export function info(user, msg?: string) {
  logEntry('info', user, msg);
}

export function warn(user, msg?: string) {
  logEntry('warn', user, msg);
}

export function error(user, msg?: string) {
  logEntry('error', user, msg);
  logger.on('finish', () => shutdown());
  logger.end();
}

export function quit() {
  if (logger) {
    logger.clear();
  }
}

function logEntry(type, user, msg?: string) {
  // user is an optional parameter
  const parsedMessage = user && msg ? `[u: ${user.id}] ${msg}` : user;

  if (!logger) {
    // Delay configuration as long as possible to be sure that process.title is set.
    logger = winston.createLogger({
      transports: configTransports()
    });
  }

  logger.log(type, parsedMessage);
}

function configTransports() {
  const transports = [];

  if (get('log:file')) {
    let logDirectory = path.normalize(get('log:directory'));

    if (logDirectory.charAt(0) !== path.sep) {
      logDirectory = path.join(root(), logDirectory);
    }

    const fileName = path.join(logDirectory, `${process.title}.log`);

    if (!fs.existsSync(logDirectory)) {
      console.error(`${'ERROR:'.red} Log directory ${logDirectory} doesn't exist.`);
      process.exit(1);
    }

    if (get('log:clear_at_startup') && fs.existsSync(fileName)) {
      try {
        fs.unlinkSync(fileName);
      } catch (e) {
        // Race condition is possible
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
    }

    const fileTransportOptions = {
      filename: fileName,
      handleExceptions: true
    };

    const fileTransport = get('log:rotate_daily')
      ? new DailyRotateFile(fileTransportOptions)
      : new winston.transports.File(fileTransportOptions);

    transports.push(fileTransport);
  }

  if (get('log:console')) {
    const consoleTransport = new MasTransport({
      handleExceptions: true
    });

    transports.push(consoleTransport);
  }

  if (get('papertrail:enabled')) {
    const papertrailTransport = new (winston.transports as any).Syslog({
      host: get('papertrail:host'),
      port: get('papertrail:port'),
      level: get('papertrail:level'),
      hostname: 'mas',
      program: process.title,
      logFormat: (level, message) => `[${level}] ${message}`,
      handleExceptions: true
    });

    transports.push(papertrailTransport);
  }

  return transports;
}
