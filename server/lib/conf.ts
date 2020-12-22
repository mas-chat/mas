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

import path from 'path';
import assert from 'assert';
import nconf from 'nconf';
import 'colors';

const rootPath = computeRoot();

nconf
  .env({
    separator: '__',
    lowerCase: true,
    parseValues: true
  })
  .argv()
  .file('user_overrides', {
    file: path.join(rootPath, 'server', 'mas.conf'),
    format: nconf.formats.ini
  })
  .file('defaults', {
    file: path.join(rootPath, 'server', 'mas.conf.default'),
    format: nconf.formats.ini
  });

export function get(key: string) {
  return getValue(key);
}

export function getComputed(key: string) {
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
}

export function root() {
  return computeRoot();
}

function getValue(key: string) {
  const value = nconf.get(key);

  if (value === undefined) {
    // TODO: Add config validator, allows very early exit
    console.error(`Missing config variable: ${key}`); // eslint-disable-line no-console
    process.exit(1);
  }

  return value;
}

function computeRoot() {
  const projectRootOption = process.env.PROJECT_ROOT;

  if (projectRootOption && projectRootOption.charAt(0) !== path.sep) {
    console.error('Root parameter must be absolute directory path'); // eslint-disable-line no-console
    process.exit(1);
  }

  return projectRootOption || path.join(__dirname, '..');
}
