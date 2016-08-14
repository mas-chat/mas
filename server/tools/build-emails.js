#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const juice = require('juice');
const mkdirp = require('mkdirp');

const srcDir = path.join(__dirname, '..', 'emails');
const dstDir = path.join(srcDir, 'build');
const files = fs.readdirSync(srcDir);
const isHBSfile = /\.hbs$/;

mkdirp.sync(dstDir);

files.filter(fileName => isHBSfile.test(fileName)).forEach(fileName => {
    juice.juiceFile(path.join(srcDir, fileName), {}, (err, html) => {
        if (err) {
            throw err;
        }

        fs.writeFileSync(path.join(dstDir, fileName), html);
    });
});
