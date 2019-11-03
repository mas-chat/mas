//
//   Copyright 2009-2015 Ilkka Oksanen <iao@iki.fi>
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

import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import nodeMaileHtmlToText from 'nodemailer-html-to-text';
import handlebars from 'handlebars';
import { get, root } from '../lib/conf';
import { info, warn } from '../lib/log';

const htmlToText = nodeMaileHtmlToText.htmlToText;
const templateCache = {};
let transporter;
let fromAddress;
let senderAddress;

setupTransporter();

exports.send = function send(templateName, data, address, subject) {
  const templatePath = path.join(root(), 'server', templateName);
  let template = templateCache[templatePath];

  if (!template) {
    template = handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
    templateCache[templatePath] = template;
  }

  info(`Sending email to: ${address}`);

  transporter.sendMail(
    {
      from: `MAS admin <${fromAddress}>`,
      sender: senderAddress,
      to: address,
      subject,
      html: template(data)
    },
    error => {
      if (error) {
        warn(`Failed to send email: ${error}`);
      }
    }
  );
};

function setupTransporter() {
  if (get('mailgun:enabled')) {
    const mailgun = require('nodemailer-mailgun-transport'); // Slow module to require
    const mailgunAuth = {
      auth: {
        api_key: get('mailgun:api_key'), // eslint-disable-line camelcase
        domain: get('mailgun:domain')
      }
    };

    transporter = nodemailer.createTransport(mailgun(mailgunAuth));
    fromAddress = get('mailgun:from');
    senderAddress = get('mailgun:sender');
  } else if (get('smtp:enabled')) {
    const smtpTransport = require('nodemailer-smtp-transport');
    const smtpOptions: { [key: string]: any } = {
      host: get('smtp:server'),
      port: get('smtp:port')
    };

    if (get('smtp:user').length !== 0) {
      smtpOptions.auth = {
        user: get('smtp:user'),
        pass: get('smtp:password')
      };
    }

    transporter = nodemailer.createTransport(smtpTransport(smtpOptions));
    fromAddress = get('site:admin_email');
    senderAddress = fromAddress;
  } else {
    transporter = nodemailer.createTransport({
      sendmail: true
    });
    fromAddress = get('site:admin_email');
    senderAddress = fromAddress;
  }

  transporter.use('compile', htmlToText());
}
