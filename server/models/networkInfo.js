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

const Model = require('./model');

module.exports = class NetworkInfo extends Model {
    static async create(props) {
        const data = {
            userId: props.userId,
            network: props.network,
            nick: props.nick,
            state: props.state || 'disconnected',
            retryCount: 0
        };

        return await super.create(data);
    }

    static get mutableProperties() {
        return [
            'nick',
            'state',
            'retryCount'
        ];
    }
};
