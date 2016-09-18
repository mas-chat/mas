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

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const uuid = require('uid2');
const md5 = require('md5');
const redis = require('../lib/redis').createClient();
const UserGId = require('./userGId');
const Model = require('./model');

module.exports = class User extends Model {
    static async create(props) {
        trimWhiteSpace(props);

        const passwordValidation = validatePassword(props.password);

        if (!passwordValidation.valid) {
            const user = new User();
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
            inUse: props.inUse || false,
            canUseIRC: props.canUseIRC || false,
            lastIp: null,
            lastLogout: new Date(0),
            planLevel: props.planLevel || 50,
            discount: props.discount || 0,
            name: props.name,
            nick: props.nick,
            password: bcrypt.hashSync(props.password, bcrypt.genSaltSync(10)),
            passwordType: 'bcrypt',
            registrationTime: new Date(),
            secret: null,
            secretExpires: null
        };

        return await super.create(data);
    }

    static get setters() {
        return {
            name: function name(realName) {
                if (!realName || realName.length < 6) {
                    return { valid: false, error: 'Please enter at least 6 characters.' };
                }

                return { valid: true, value: realName };
            },
            email: function email(emailAddress) {
                const parts = emailAddress.split('@');

                if (!emailAddress || parts.length !== 2 || parts[0].length === 0 ||
                    !parts[1].includes('.') ||
                    parts[1].length < 3) {
                    return { valid: false, error: 'Please enter a valid email address.' };
                }

                return { valid: true, value: emailAddress };
            },
            nick: function nick(nickName) {
                if (!nickName) {
                    return { valid: false, error: 'Please enter a nick' };
                } else if (nickName.length < 3 || nickName.length > 15) {
                    return { valid: false, error: 'Nick has to be 3-15 characters long.' };
                } else if (/[0-9]/.test(nickName.charAt(0))) {
                    return { valid: false, error: 'Nick can\'t start with digit' };
                } else if (!(/^[A-Z`a-z0-9[\]\\_\^{|}]+$/.test(nickName))) {
                    const valid = [ 'a-z', '0-9', '[', ']', '\\', '`', '_', '^', '{', '|', '}' ];
                    return { valid: false,
                        error: `Illegal characters, allowed are ${valid.join(', ')}` };
                }

                return { valid: true, value: nickName };
            }
        };
    }

    static get mutableProperties() {
        return [
            'extAuthId',
            'inUse',
            'lastIp',
            'lastLogout',
            'name',
            'email',
            'nick',
            'canUseIRC',
            'registrationTime'
        ];
    }

    static get config() {
        return {
            indexErrorDescriptions: {
                nick: 'This nick is already reserved.',
                email: 'This email address is already reserved.'
            }
        };
    }

    get gId() {
        if (!this._gId) {
            this._gId = UserGId.create({ type: 'mas', id: this.id });
        }

        return this._gId;
    }

    get gIdString() {
        if (!this._gIdString) {
            this._gIdString = this.gId.toString();
        }

        return this._gIdString;
    }

    async isOnline() {
        const sessions = await redis.pubsub('NUMSUB', this.id);

        return sessions[1] !== 0;
    }

    async generateNewSecret() {
        const newSecret = {
            secret: uuid(20),
            secretExpires: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000))
        };

        await this._set(newSecret);

        return newSecret;
    }

    async changeEmail(email) {
        const trimmedEmail = email.trim();

        if (this.get('email') !== trimmedEmail) {
            await this._set({
                email: trimmedEmail,
                emailMD5: md5(trimmedEmail.toLowerCase()),
                emailConfirmed: false
            });

            // TODO: await sendEmailConfirmationEmail(this.id, trimmedEmail);
        }
    }

    async changePassword(password) {
        const passwordValidation = validatePassword(password);

        if (!passwordValidation.valid) {
            this.errors = { password: passwordValidation.error };
            return null;
        }

        const newPassword = {
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
            passwordType: 'bcrypt'
        };

        await this._set(newPassword);

        return newPassword;
    }

    async verifyPassword(password) {
        const encryptedPassword = this.get('password');
        const encryptionMethod = this.get('passwordType');

        if (!encryptedPassword) {
            return false;
        }

        if (encryptionMethod === 'sha256') {
            const expectedSha = crypto.createHash('sha256').update(password, 'utf8').digest('hex');

            if (encryptedPassword === expectedSha) {
                // Migrate to bcrypt
                await this.changePassword(password); // TODO: Can't fail
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

    async delete() {
        return await this._set({
            deleted: true,
            deletionTime: new Date(),
            email: null,
            deletedEmail: this.get('email'),
            emailMD5: null,
            extAuthId: null
        });
    }
};

function trimWhiteSpace(props) {
    for (const prop of Object.keys(props)) {
        const value = props[prop];

        if (typeof value === 'string') {
            props[prop] = value.trim();
        }
    }
}

function validatePassword(password) {
    if (!password || password.length < 6) {
        return { valid: false, error: 'Please enter at least 6 characters.' };
    }

    return { valid: true };
}
