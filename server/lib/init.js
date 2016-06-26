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
      semver = require('semver'),
      _ = require('lodash'),
      conf = require('./conf'),
      log = require('./log');

checkNodeVersion();

let stateChangeCallbacks = [];
let shutdownInProgress = false;

const shutdownOrder = {
    beforeShutdown: 1,
    shutdown: 2,
    afterShutdown: 3
};

process.on('unhandledRejection', function(reason, p){
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason); // eslint-disable-line no-console
});

exports.configureProcess = function(serverName) {
    let processName = 'mas-' + serverName + '-' + conf.get('common:env');

    process.umask(18); // file: rw-r--r-- directory: rwxr-xr-x
    process.title = processName;
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    process.on('message', function(msg) {
        // Message from PM2
        if (msg === 'shutdown') {
            shutdown();
        }
    });
};

exports.on = function(state, callback) {
    assert(shutdownOrder[state]);

    stateChangeCallbacks.push({ state: state, cb: callback });
};

exports.shutdown = function() {
    shutdown();
};

async function shutdown() {
    if (shutdownInProgress) {
        return;
    }

    shutdownInProgress = true;

    log.info('Shutdown sequence started.');

    let entries = _.sortBy(stateChangeCallbacks, function(entry) {
        return shutdownOrder[entry.state];
    });

    for (let entry of entries) {
        await entry.cb();

        console.log('Shutdown complete.'); // eslint-disable-line no-console
        process.exit(0);
    }
}

function checkNodeVersion() {
    if (semver.lt(process.version, 'v4.0.0')) {
        let msg = 'ERROR: Installed Node.js version must be at least v5.0.0';
        console.log(msg); // eslint-disable-line no-console
        process.exit(1);
    }
}
