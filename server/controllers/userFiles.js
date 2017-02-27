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
const send = require('koa-send');
const conf = require('../lib/conf');

const oneYearInSeconds = 60 * 60 * 24 * 365;
let dataDirectory = path.normalize(conf.get('files:upload_directory'));

// TODO: make this computed config property. Add exists check.
if (dataDirectory.charAt(0) !== path.sep) {
    dataDirectory = path.join(__dirname, '..', '..', dataDirectory);
}

module.exports = async function userFiles(ctx) {
    const uuid = ctx.params.uuid.substring(0, 20);
    const subDirectory = uuid.substring(0, 2);
    const metaData = await readMetaDataFile(path.join(dataDirectory, subDirectory, `${uuid}.json`));

    await send(ctx, path.join(subDirectory, uuid + path.extname(metaData.originalFileName)), {
        root: dataDirectory
    });

    ctx.set('Cache-Control', `public, max-age=${oneYearInSeconds}`);
};

function readMetaDataFile(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}
