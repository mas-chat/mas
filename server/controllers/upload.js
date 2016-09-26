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

const spawn = require('child_process').spawn;
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const uuid = require('uid2');
const conf = require('../lib/conf');
const log = require('../lib/log');

let dataDirectory = path.normalize(conf.get('files:upload_directory'));

// TODO: move this to library.
if (dataDirectory.charAt(0) !== path.sep) {
    dataDirectory = path.join(__dirname, '..', '..', dataDirectory);
}

module.exports = function *handle() {
    const user = this.mas.user;

    if (!this.request.body || !this.request.body.files || !this.request.body.files.file) {
        this.status = 400;
        return;
    }

    try {
        const url = yield upload(user, this.request.body.files.file);

        this.status = 200;
        this.body = { url: [ url ] };

        log.info(user, `Successful upload: ${url}`);
    } catch (e) {
        this.status = e === 'E_TOO_LARGE' ? 413 : 400;

        log.warn(user, `Upload failed: ${e}`);
    }
};

function *upload(user, fileObject) {
    const fileName = fileObject.name;
    const filePath = fileObject.path;
    const extension = path.extname(fileName);

    const fileUUID = uuid(20);
    const hashDirectory = fileUUID.substring(0, 2);

    const targetDirectory = path.join(dataDirectory, hashDirectory);

    if (fileObject.size > 10000000) { // 10MB
        throw 'E_TOO_LARGE';
    }

    if (conf.get('files:autorotate_jpegs')) {
        yield autoRotateJPEGFile(filePath, extension);
    }

    yield ensureUploadDirExists(targetDirectory);
    yield copy(filePath, path.join(targetDirectory, fileUUID + extension));
    yield writeMetaDataFile(path.join(targetDirectory, `${fileUUID}.json`), fileName, user.id);

    return `${conf.getComputed('site_url')}/files/${fileUUID}/${encodeURIComponent(fileName)}`;
}

function ensureUploadDirExists(targetDirectory) {
    return new Promise((resolve, reject) => mkdirp(targetDirectory, err => {
        if (err) {
            reject(err);
        } else {
            resolve();
        }
    }));
}

function autoRotateJPEGFile(fileName, extension) {
    if (!(extension === '.jpg' || extension === '.jpeg')) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const exiftrans = spawn('exiftran', [ '-ai', fileName ]);

        exiftrans.on('error', err => {
            reject(err);
        });

        exiftrans.on('close', code => {
            if (code !== 0) {
                reject(`JPEG autorotation using exiftrans failed, exit code: ${code}`);
            } else {
                resolve();
            }
        });
    });
}

function copy(srcFilePath, targetFilePath) {
    return new Promise((resolve, reject) => {
        const rd = fs.createReadStream(srcFilePath);
        const wr = fs.createWriteStream(targetFilePath);

        const rejectCleanup = err => {
            rd.destroy();
            wr.end();
            reject(err);
        };

        rd.on('error', rejectCleanup);
        wr.on('error', rejectCleanup);
        wr.on('finish', resolve);

        rd.pipe(wr);
    });
}

function writeMetaDataFile(filePath, originalFileName, userId) {
    const metaData = {
        userId,
        originalFileName,
        ts: Math.round(Date.now() / 1000)
    };

    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, JSON.stringify(metaData), err => {
            if (err) {
                reject('File upload metadata file write error');
            } else {
                resolve();
            }
        });
    });
}
