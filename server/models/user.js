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

const crypto = require('crypto'),
      bcrypt = require('bcrypt'),
      uuid = require('uid2'),
      md5 = require('md5'),
      Model = require('./model'),
      userValidator = require('../validators/user');

module.exports = class User extends Model {
    static async create(props) {
        trimWhiteSpace(props);

        const passwordValidation = validatePassword(props.password);

        if (!passwordValidation.valid) {
            let user = new User();
            user.errors = { password: passwordValidation.error };
            return user;
        }

        const data = {
            deleted: false,
            deletionTime: null,
            email: props.email,
            deletedEmail: null,
            emailConfirmed: false,
            emailMD5: md5(props.email.toLowerCase()),
            extAuthId: null,
            inUse: true,
            lastIp: null,
            lastLogout: new Date(0),
            name: props.name,
            nick: props.nick,
            password: bcrypt.hashSync(props.password, bcrypt.genSaltSync(10)),
            passwordType: 'bcrypt',
            registrationTime: new Date(),
            secret: null,
            secretExpires: null
        };

        return await Model.create.call(this, data);
       // return await super.create(data);
    }

    get config() {
        return {
            validator: userValidator,
            allowedProps: [
                'extAuthId',
                'inUse',
                'lastIp',
                'lastLogout',
                'name',
                'nick',
                'registrationTime'
            ],
            indexErrorDescriptions: {
                nick: 'This nick is already reserved.',
                email: 'This email address is already reserved.'
            }
        };
    }

    get gId() {
        return `m${this.id}`;
    }

    async generateNewSecret() {
        let ts = new Date();

        let secret = {
            secret: uuid(20),
            secretExpires: new Date(ts.getTime() + 14 * 24 * 60 * 60 * 1000)
        };

        return await this.set(secret);
    }

    async changeEmail(email) {
        email = email.trim();

        if (this.get('email') !== email) {
            await this.set({
                email: email,
                emailMD5: md5(email.toLowerCase()),
                emailConfirmed: false
            });

            // TBD: await sendEmailConfirmationEmail(this.id, email);
        }
    }

    async changePassword(password) {
        const passwordValidation = validatePassword(password);

        if (!passwordValidation.valid) {
            this.errors = { password: passwordValidation.error };
            return;
        }

        return await this.set({
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
            passwordType: 'bcrypt'
        });
    }

    async verifyPassword(password) {
        const encryptedPassword = this.get('password');
        const encryptionMethod = this.get('passwordType');

        if (!encryptedPassword) {
            return false;
        }

        if (encryptionMethod === 'sha256') {
            let expectedSha = crypto.createHash('sha256').update(password, 'utf8').digest('hex');

            if (encryptedPassword === expectedSha) {
                // Migrate to bcrypt
                await this.changePassword(password); // TBD: Can't fail
                return true;
            }
        } else if (encryptionMethod === 'bcrypt') {
            return bcrypt.compareSync(password, encryptedPassword);
        } else if (encryptionMethod === 'plain') {
            // Only used in testing
            return encryptedPassword === password;
        }

        return false;
    }

    async disableUser() {
        return await this.set({
            deleted: true,
            deletionTime: Date.now(),
            email: null,
            deletedEmail: this._props['email'],
            emailMD5: null,
            extAuthId: null
        });
    }
};

function trimWhiteSpace(props) {
    for (let prop in props) {
        props[prop] = props[prop].trim();
    }
}

function validatePassword(password) {
    if (!password || password.length < 6) {
        return { valid: false, error: 'Please enter at least 6 characters.' };
    }

    return { valid: true };
}
