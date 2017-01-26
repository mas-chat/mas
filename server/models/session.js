//
//   Copyright 2009-2017 Ilkka Oksanen <iao@iki.fi>
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

const uuid = require('uid2');
const Model = require('./model');

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

module.exports = class Session extends Model {
    static async create(props) {
        const now = new Date();

        const data = {
            userId: props.userId,
            ip: props.ip,
            token: uuid(20),
            updatedAt: now
        };

        return super.create(data);
    }

    static get mutableProperties() {
        return [
            'ip'
        ];
    }

    get expired() {
        const now = new Date();

        return (now - this.get('updatedAt')) > ONE_WEEK_IN_MS;
    }
};
