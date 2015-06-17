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
      path = require('path'),
      fs = require('fs'),
      npid = require('npid'),
      conf = require('./conf'),
      log = require('./log');

let shutdownCallbacks = [];

exports.configureProcess = function(serverName) {
    let processName = 'mas-' + serverName + '-' + conf.get('common:env');
    let pid;

    process.umask(18); // file: rw-r--r-- directory: rwxr-xr-x
    process.title = processName;

    if (conf.get('pid:enabled')) {
        let pidDirectory = conf.get('pid:directory');

        if (pidDirectory.charAt(0) !== path.sep) {
            pidDirectory = path.join(__dirname, '..', '..', pidDirectory);
        }

        let pidFile = path.join(pidDirectory, processName + '.pid');

        try {
            pid = npid.create(pidFile);
            pid.removeOnExit();
        } catch (e) {
            if (e.code === 'EEXIST') {
                pid = parseInt(fs.readFileSync(pidFile));

                try {
                    process.kill(pid, 0);
                } catch (killE) {
                    // Process mentioned in the pid file is not running anymore
                    log.info('Removing stale pid file: ' + pidFile);
                    fs.unlinkSync(pidFile);
                    pid = 0;
                }

                if (pid !== 0) {
                    log.error('Pid file (' + pidFile + ') exists. Process is already running.');
                }
            } else {
                log.error('Unknown pid file error.');
            }
        }

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
};

// pitaa palauttaa ne erikoiscasen process.exitit muuten race startupin ja shutdown valilla redisin kanssa ainakin

// NOTE: This will not close existing connections, which will wait for timeout before they are closed. To close them immediately , first make a list of connected sockets

// kakkos stepissa

// var socketlist = [];
// io.sockets.on('connection', function(socket) {
//     socketlist.push(socket);
//     socket.emit('socket_is_connected','You are connected!');
//     socket.on('close', function () {
//       console.log('socket closed');
//       socketlist.splice(socketlist.indexOf(socket), 1);
//     });
// });
// Then close all existing connections

// socketlist.forEach(function(socket) {
//   socket.destroy();
// });

masctl pitaa lahettaa SIGTERM vaan

exports.on = function(event, callback) {
    assert(event === 'shutdown');

    shutdownCallbacks.push(callback);
};

exports.shutdown = function() {
    shutdown();
};

function shutdown() {
    shutdownCallbacks.forEach(function(callback) {
        callback();
    });
};
