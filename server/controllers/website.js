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

'use strict';

const path = require('path');
const fs = require('fs');
const authOptions = require('../lib/authOptions');

const manifest = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../website/dist/manifest.json')));

module.exports = function *index(next) {
    if (this.mas.user) {
        this.redirect('/app');
    } else {
        yield this.render('index', {
            config: JSON.stringify({ auth: authOptions }),
            appJSFile: manifest['main.js']
        });
    }
};
