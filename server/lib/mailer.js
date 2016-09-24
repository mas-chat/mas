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

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const mailgun = require('nodemailer-mailgun-transport');
const htmlToText = require('nodemailer-html-to-text').htmlToText;
const smtpTransport = require('nodemailer-smtp-transport');
const handlebars = require('handlebars');
const conf = require('../lib/conf');
const log = require('../lib/log');

const templateCache = {};
let transporter;
let fromAddress;
let senderAddress;

setupTransporter();

exports.send = function send(templateName, data, address, subject) {
    const templatePath = path.join(__dirname, '..', templateName);
    let template = templateCache[templatePath];

    if (!template) {
        template = handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
        templateCache[templatePath] = template;
    }

    log.info(`Sending email to: ${address}`);

    transporter.sendMail({
        from: `MAS admin <${fromAddress}>`,
        sender: senderAddress,
        to: address,
        subject,
        html: template(data)
    }, error => {
        if (error) {
            log.warn(`Failed to send email: ${error}`);
        }
    });
};

function setupTransporter() {
    if (conf.get('mailgun:enabled')) {
        const mailgunAuth = {
            auth: {
                api_key: conf.get('mailgun:api_key'), // eslint-disable-line camelcase
                domain: conf.get('mailgun:domain')
            }
        };

        transporter = nodemailer.createTransport(mailgun(mailgunAuth));
        fromAddress = conf.get('mailgun:from');
        senderAddress = conf.get('mailgun:sender');
    } else if (conf.get('smtp:enabled')) {
        const smtpOptions = {
            host: conf.get('smtp:server'),
            port: conf.get('smtp:port')
        };

        if (conf.get('smtp:user').length !== 0) {
            smtpOptions.auth = {
                user: conf.get('smtp:user'),
                pass: conf.get('smtp:password')
            };
        }

        transporter = nodemailer.createTransport(smtpTransport(smtpOptions));
        fromAddress = conf.get('site:admin_email');
        senderAddress = fromAddress;
    } else {
        transporter = nodemailer.createTransport();
        fromAddress = conf.get('site:admin_email');
        senderAddress = fromAddress;
    }

    transporter.use('compile', htmlToText());
}
