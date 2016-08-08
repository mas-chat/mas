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

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const parse = require('co-busboy');
const uuid = require('uid2');
const conf = require('../lib/conf');
const log = require('../lib/log');

let dataDirectory = path.normalize(conf.get('files:upload_directory'));

// TODO: move this to library.
if (dataDirectory.charAt(0) !== path.sep) {
    dataDirectory = path.join(__dirname, '..', '..', dataDirectory);
}

module.exports = async function upload() {
    if (!this.request.is('multipart/*') || !this.mas.user) {
        // The body isn't multipart, so busboy can't parse it
        return;
    }

    const userId = this.mas.user.id;
    const parts = parse(this);
    const urls = [];

    let part;

    function createMetaDataFileHandler(err) {
        if (err) {
            log.warn(userId, `Upload metadata write failed, reason: ${err}`);
        }
    }

    while ((part = await parts)) { // eslint-disable-line no-cond-assign
        if (part.length) {
            // TDB: Handle if field
            // key: part[0]
            // value: part[1]
        } else {
            // Otherwise, it's a stream
            const name = uuid(20);
            const firstTwo = name.substring(0, 2);

            const targetDirectory = path.join(dataDirectory, firstTwo);

            try {
                mkdirp.sync(targetDirectory);
            } catch (e) {
                if (e.code !== 'EEXIST') {
                    throw e;
                }
            }

            const extension = path.extname(part.filename);
            part.pipe(fs.createWriteStream(path.join(targetDirectory, name + extension)));

            const metaData = {
                userId,
                ts: Math.round(Date.now() / 1000)
            };

            fs.writeFile(path.join(targetDirectory, `${name}.json`), JSON.stringify(metaData),
                createMetaDataFileHandler);

            urls.push(`${conf.getComputed('site_url')}/files/${name}${extension}`);
        }
    }

    this.status = 200;
    this.body = { url: urls };
};
