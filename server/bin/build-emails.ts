/* eslint-disable */

'use strict';

import fs from 'fs';
import path from 'path';
import juice from 'juice';
import mkdirp from 'mkdirp';
import { root } from '../lib/conf';

const srcDir = path.join(root(), 'server/emails');
const dstDir = path.join(srcDir, 'build');
const files = fs.readdirSync(srcDir);
const isHBSfile = /\.hbs$/;

mkdirp.sync(dstDir);

files
  .filter(fileName => isHBSfile.test(fileName))
  .forEach(fileName => {
    juice.juiceFile(path.join(srcDir, fileName), {}, (err, html) => {
      if (err) {
        throw err;
      }

      fs.writeFileSync(path.join(dstDir, fileName), html);
    });
  });

console.log('Email templates built.');
