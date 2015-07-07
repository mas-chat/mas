//
//   Copyright 2014-2015 Ilkka Oksanen <iao@iki.fi>
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
      path = require('path'),
      fs = require('fs'),
      semver = require('semver'),
      mkdirp = require('mkdirp'),
      _ = require('lodash'),
      conf = require('./conf'),
      log = require('./log');

checkNodeVersion();

let stateChangeCallbacks = [];

const shutdownOrder = {
    beforeShutdown: 1,
    shutdown: 2,
    afterShutdown: 3
};

exports.configureProcess = function(serverName) {
    let processName = 'mas-' + serverName + '-' + conf.get('common:env');

    process.umask(18); // file: rw-r--r-- directory: rwxr-xr-x
    process.title = processName;
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};

exports.on = function(state, callback) {
    assert(shutdownOrder[state]);

    stateChangeCallbacks.push({ state: state, cb: callback });
};

exports.shutdown = function() {
    let callbacks = _.sortBy(stateChangeCallbacks, function(entry) {
        return shutdownOrder[entry.state];
    });

    co(function*() {
        callbacks.forEach(function(callback) {
            if (isGeneratorFunction(handler)) {
                yield callback.cb();
            } else {
                callback.cb();
            }
        });
    })();
};

function checkNodeVersion() {
    if (semver.lt(process.version, 'v0.12.0')) {
        console.log('ERROR: Installed Node.js version must be at least v0.12.0');
        process.exit(1);
    }
}
