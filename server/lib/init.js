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

let path = require('path'),
    npid = require('npid'),
    conf = require('./conf'),
    log = require('./log'),
    courier = require('./courier');

module.exports = function configureProcess(serverName) {
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
            log.error(e.code === 'EEXIST' ?
                'Pid file (' + pidFile + ') exists. Is the process already running?' :
                'Unknown pid file error.');
        }

        let deletePidAndExit = function() {
            pid.remove();
            courier.shutdown();
        };

        process.on('SIGINT', deletePidAndExit);
        process.on('SIGTERM', deletePidAndExit);
    }
};
