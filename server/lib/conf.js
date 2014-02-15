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

var path = require('path'),
    fs = require('fs'),
    nconf = require('nconf');

require('colors');

var configFile = path.normalize(__dirname + '/../../mas.conf');

if (!fs.existsSync(configFile)) {
    console.error('ERROR: '.red + 'Config file ' + configFile + ' missing.');
    process.exit(1);
}

nconf.argv();

nconf.use('file', {
    file: configFile,
    format: nconf.formats.ini
});

module.exports = nconf;