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

import { type } from 'os';
import { get, root } from '../lib/conf';

const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const Settings = require('../models/settings');
const log = require('../lib/log');

const DEFAULT_ENTRY_FILE_NAME = 'index.js';
const DEFAULT_CSS_FILE_NAME = 'index.css';

function getMainEntryFileNamesAndModeForV2Client() {
  try {
    const metaDataFile = fs.readFileSync(path.join(root(), 'new-client/dist/meta.json'), 'utf8');
    const outputs = Object.keys(JSON.parse(metaDataFile).outputs) || [];
    const jsFileNameWithPath = outputs.find(file => file.match(/^dist\/index-\w+.js$/));
    const cssFileNameWithPath = outputs.find(file => file.match(/^dist\/index-\w+.css$/));

    if (!jsFileNameWithPath || !cssFileNameWithPath) {
      throw new Error('No entry file found');
    }

    const jsFileName = jsFileNameWithPath.split('/').pop();
    const cssFileName = cssFileNameWithPath.split('/').pop();

    if (typeof jsFileName !== 'string' || typeof cssFileName !== 'string') {
      throw new Error('No entry file found');
    }

    return { mode: 'production', jsFileName, cssFileName };
  } catch {
    return { mode: 'development', jsFileName: DEFAULT_ENTRY_FILE_NAME, cssFileName: DEFAULT_CSS_FILE_NAME };
  }
}

let templateV1;
let templateV2;

try {
  templateV1 = handlebars.compile(fs.readFileSync(path.join(root(), 'client/dist/index.html'), 'utf8'));
} catch (e) {
  templateV1 = null;
}

try {
  templateV2 = handlebars.compile(fs.readFileSync(path.join(root(), 'new-client/html/index.html'), 'utf8'));
} catch (e) {
  templateV2 = null;
}

const revisionPath = path.join(root(), 'server/REVISION');
let revision;

try {
  revision = fs.readFileSync(revisionPath, 'utf8');
} catch (e) {
  revision = 'unknown';
}

const { mode, cssFileName, jsFileName } = getMainEntryFileNamesAndModeForV2Client();

log.info(`Server new client in ${mode} mode`);

module.exports = async function index(ctx) {
  ctx.set('Cache-control', 'private, max-age=0, no-cache');

  const user = ctx.mas.user;

  if (!user) {
    ctx.response.redirect('/');
    return;
  }

  const settings = await Settings.findFirst({ userId: user.id });
  const theme = settings.get('theme').split('-')[0];
  const version = settings.get('theme').split('-')[1] || 'v1';
  const template = version === 'v1' ? templateV1 : templateV2;

  if (!template) {
    ctx.body = 'index.html file is missing.';
    return;
  }

  ctx.body = template({
    jsConfig: JSON.stringify({
      socketHost: get('session:socket_host'),
      revision
    }),
    jsScriptTag: `<script src="/app/client-assets/${jsFileName}"></script>`,
    cssTag: `<link rel="stylesheet" href="/app/client-assets/${cssFileName}">`,
    extraClientHead: get('snippets:extra_client_head') || '',
    extraClientBody: get('snippets:extra_client_body') || '',
    colorMode: theme === 'default' ? 'light' : 'dark',
    revision
  });
};
