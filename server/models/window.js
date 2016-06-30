//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
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

module.exports = class Window extends Model {
    static async create(props) {
        const data = {
            userId: props.userId,
            conversationId: props.conversationId,
            emailAlert: true,
            notificationAlert: false,
            soundAlert: false,
            titleAlert: false,
            minimizedNamesList: true,
            desktop: props.desktop || 0,
            row: 0,
            column: 0
        };

        return await super.create(data);
    }
};
