//
//   Copyright 2009-2016 Ilkka Oksanen <iao@iki.fi>
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

let validator = new UserValidator();

exports.validate = function(props) {
    let errors = {};

    for (const prop in props) {
        const validate = validator[prop];

        if (validate) {
            const { valid, error } = validate(props[prop]);

            if (!valid) {
                errors[prop] = error;
            }
        }
    }

    return { valid: Object.keys(errors).length === 0, errors: errors };
}

function UserValidator() {}

UserValidator.prototype.name = function(name) {
    if (!name || name.length < 6) {
        return { valid: false, error: 'Please enter at least 6 characters.' };
    }

    return { valid: true };
}

UserValidator.prototype.email = function(email) {
    const parts = email.split('@');

    if (!email || parts.length !== 2 || parts[0].length === 0 || !parts[1].includes('.') ||
        parts[1].length < 3) {
        return { valid: false, error: 'Please enter a valid email address.' };
    }

    return { valid: true };
}

UserValidator.prototype.nick = function(nick) {
    if (!nick) {
        return { valid: false, error: 'Please enter a nick' };
    } else if (nick.length < 3 || nick.length > 15) {
        return { valid: false, error: 'Nick has to be 3-15 characters long.' };
    } else if (/[0-9]/.test(nick.charAt(0))) {
        return { valid: false, error: 'Nick can\'t start with digit' };
    } else if (!(/^[A-Z\`a-z0-9[\]\\_\^{|}]+$/.test(nick))) {
        let valid = [ 'a-z', '0-9', '[', ']', '\\', '`', '_', '^', '{', '|', '}' ];
        return { valid: false, error: 'Illegal characters, allowed are ' + valid.join(', ') };
    }

    return { valid: true };
}
