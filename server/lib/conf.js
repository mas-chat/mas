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

const path = require('path');
const assert = require('assert');
const fs = require('fs');
const nconf = require('nconf');
const argv = require('yargs').argv;

require('colors');

const configFileOption = argv.configFile;
let configFile;

if (configFileOption && configFileOption.charAt(0) === path.sep) {
    // Absolute path
    configFile = path.normalize(configFileOption);
} else {
    configFile = path.join(__dirname, '..', '..', configFileOption || 'mas.conf');
}

if (!fs.existsSync(configFile)) {
    const msg = `${'ERROR:'.red} Config file ${configFile} missing.`;
    console.error(msg); // eslint-disable-line no-console
    process.exit(1);
}

nconf.argv().add('file', {
    file: configFile,
    format: nconf.formats.ini
});

exports.get = function get(key) {
    return getValue(key);
};

exports.getComputed = function getComputed(key) {
    let ret = '';

    switch (key) {
        case 'site_url':
            ret = getValue('site:site_url');

            if (ret.endsWith('/')) {
                ret = ret.substring(0, ret.length - 1);
            }
            break;

        default:
            assert(false, 'Unknown conf key');
    }

    return ret;
};

function getValue(key) {
    const value = nconf.get(key);

    if (value === undefined) {
        // TODO: Add config validator, allows very early exit
        console.error(`Missing config variable: ${key}`); // eslint-disable-line no-console
        process.exit(1);
    }

    return value;
}
