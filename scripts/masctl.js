#!/usr/bin/env node --harmony
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

var exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    semver = require('semver'),
    yargs = require('yargs');

var argv = yargs
    .usage('Usage: $0 start|stop|restart|status')
    .demand(1)
    .alias('i', 'import')
    .describe('i', 'MeetAndSpeak.com specific option.')
    .default('i', false)
    .alias('f', 'configFile')
    .describe('f', 'Configuration file.')
    .default('f', 'mas.conf')
    .alias('c', 'connman')
    .describe('c', 'Also start, stop or restart IRC connman process.')
    .default('c', false)
    .help('h')
    .alias('h', 'help')
    .version('0.0.1', 'v')
    .alias('v', 'version')
    .argv;

if (semver.lt(process.version, 'v0.11.11')) {
    console.log('ERROR: Installed Node.js version must be at least v0.11.11');
    process.exit(1);
}

var rootPath = path.join(__dirname, '..');
var configFile = path.join(rootPath, argv.configFile);

if (!fs.existsSync(configFile)) {
    console.log('ERROR: Main configuration file: ' + configFile + ' is missing.');
    process.exit(1);
}

var processes = [
    'server.js',
    'backends/irc/controller.js',
    'backends/loopback/controller.js'
];

processes.forEach(function(component) {
    var child = exec('node --harmony ' + path.join(rootPath, 'server', component));

    child.stdout.on('data', prettyPrint);
    child.stderr.on('data', prettyPrint);

    child.on('close', function(code) {
        console.log('Exit code: ' + code);
        process.exit(1);
    });
});

function prettyPrint(text) {
    process.stdout.write(text);
}
