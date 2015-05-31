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

const fs = require('fs'),
      path = require('path'),
      nodemailer = require('nodemailer'),
      mailgun = require('nodemailer-mailgun-transport'),
      htmlToText = require('nodemailer-html-to-text').htmlToText,
      handlebars = require('handlebars'),
      conf = require('../lib/conf'),
      log = require('../lib/log');

let templateCache = {};
let transporter;
let fromAddress;
let senderAddress;

setupTransporter();

exports.send = function(templateName, data, address, subject) {
    let templatePath = path.join(__dirname, '..', templateName);
    let template = templateCache[templatePath];

    if (!template) {
        template = handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
        templateCache[templatePath] = template;
    }

    log.info(`Sending email to: ${address}`);

    transporter.sendMail({
        from: 'MAS admin <' + fromAddress + '>',
        sender: senderAddress,
        to: address,
        subject: subject,
        html: template(data)
    });
};

function setupTransporter() {
    if (conf.get('mailgun:enabled') === true)  {
        let mailgunAuth = {
            auth: {
                api_key: conf.get('mailgun:api_key'),
                domain: conf.get('mailgun:domain')
            }
        };

        transporter = nodemailer.createTransport(mailgun(mailgunAuth));
        fromAddress = conf.get('mailgun:from');
        senderAddress = conf.get('mailgun:sender');
    } else {
        transporter = nodemailer.createTransport();
        fromAddress = conf.get('site:admin_email');
        senderAddress = fromAddress;
    }

    transporter.use('compile', htmlToText());
}
