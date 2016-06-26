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

module.exports = class ConversationMessage extends Model {
    static async create(props) {
        const data = {
            conversationId: props.conversationId,
            userGId: props.userGId || null,
            ts: new Date(),
            updatedTs: null,
            updatedId: null,
            cat: props.cat,
            body: props.body || null,
            status: 'original'
        };

        return await Model.create.call(this, data);
   //   return await super.create(data);
    }

    convertToNtf() {
        const ntf = {
            id: 'MSG',
            gid: this.id,
            conversationId: this.get('conversationId'),
            userId: this.get('userGId'),
            ts: Math.floor(this.get('ts').getTime() / 1000),
            cat: this.get('cat'),
            body: this.get('body') || '',
            status: this.get('status')
        }

        const updatedTs = this.get('updatedTs');

        if (updatedTs) {
            ntf.updatedTs = Math.floor(updatedTs.getTime() / 1000);
        }

        return ntf;
    }
};
