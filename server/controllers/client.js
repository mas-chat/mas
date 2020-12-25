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

import { get, root } from '../lib/conf';

const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const templatePath = path.join(root(), 'client/dist/index.html');
const template = handlebars.compile(fs.readFileSync(templatePath, 'utf8'));

const revisionPath = path.join(root(), 'server/REVISION');
let revision;

try {
  revision = fs.readFileSync(revisionPath, 'utf8'));
} catch (e) {
  revision = 'unknown'
}

module.exports = async function index(ctx) {
  ctx.set('Cache-control', 'private, max-age=0, no-cache');

  // koa-hbs can't take client/dist/index.html as a template
  ctx.body = template({
    jsConfig: JSON.stringify({
      socketHost: get('session:socket_host'),
      revision
    }),
    extraHTML: get('snippets:extra_html') || '',
    revision
  });
};
