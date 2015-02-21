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

const fs = require('fs'),
      path = require('path'),
      mkdirp = require('mkdirp'),
      parse = require('co-busboy'),
      uuid = require('uid2'),
      conf = require('../lib/conf'),
      log = require('../lib/log');

let dataDirectory = path.normalize(conf.get('files:upload_directory'));

// TBD: move this to library.
if (dataDirectory.charAt(0) !== path.sep) {
    dataDirectory = path.join(__dirname, '..', '..', dataDirectory);
}

module.exports = function*() {
    // The body isn't multipart, so busboy can't parse it
    if (!this.request.is('multipart/*')) {
        return;
    }

    let userId = this.mas.userId;
    let parts = parse(this);
    let part;
    let urls = [];

    function createMetaDataFileHandler(err) {
        if (err) {
            log.warn(userId, 'Upload metadata write failed, reason: ' + err);
        }
    }

    while ((part = yield parts)) {
        if (part.length) {
            part = part;
            // TDB: Handle if field
            // key: part[0]
            // value: part[1]
        } else {
            // Otherwise, it's a stream
            let name = uuid(20);
            let firstTwo = name.substring(0, 2);

            let targetDirectory = path.join(dataDirectory, firstTwo);

            try {
                mkdirp.sync(targetDirectory);
            } catch (e) {
                if (e.code !== 'EEXIST') {
                    throw e;
                }
            }

            let extension = path.extname(part.filename);
            part.pipe(fs.createWriteStream(path.join(targetDirectory, name + extension)));

            let metaData = {
                userId: userId,
                ts: Math.round(Date.now() / 1000)
            };

            fs.writeFile(path.join(targetDirectory, name + '.json'), JSON.stringify(metaData),
                createMetaDataFileHandler);

            urls.push(conf.get('site:url') + '/files/' + name + extension);
        }
    }

    this.status = 200;
    this.body = { url: urls };
};
