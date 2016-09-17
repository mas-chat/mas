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

const promisify = require('promisify-node');
const path = require('path');
const mkdirp = require('mkdirp');
const uuid = require('uid2');
const conf = require('../lib/conf');
const log = require('../lib/log');

const fs = promisify('fs');
let dataDirectory = path.normalize(conf.get('files:upload_directory'));

// TODO: move this to library.
if (dataDirectory.charAt(0) !== path.sep) {
    dataDirectory = path.join(__dirname, '..', '..', dataDirectory);
}

module.exports = function *upload() {
    const userId = this.mas.user.id;

    if (!this.request.body || !this.request.body.files || !this.request.body.files.file) {
        this.status = 400;
        return;
    }

    const file = this.request.body.files.file;
    const name = uuid(20);
    const firstTwo = name.substring(0, 2);
    const targetDirectory = path.join(dataDirectory, firstTwo);
    const extension = path.extname(file.name);

    // TODO: Check maximum size

    try {
        mkdirp.sync(targetDirectory);
    } catch (e) {
        if (e.code !== 'EEXIST') {
            throw e;
        }
    }

    try {
        yield fs.rename(file.path, path.join(targetDirectory, name + extension));
    } catch (e) {
        log.warn(userId, `Upload rename failed, reason: ${e}`);
        this.status = 400;
        return;
    }

    const metaData = { userId, ts: Math.round(Date.now() / 1000) };

    try {
        yield fs.writeFile(path.join(targetDirectory, `${name}.json`), JSON.stringify(metaData));
    } catch (e) {
        log.warn(userId, `Upload meta data creation failed, reason: ${e}`);
        this.status = 400;
        return;
    }

    this.status = 200;
    this.body = { url: [ `${conf.getComputed('site_url')}/files/${name}${extension}` ] };
};
