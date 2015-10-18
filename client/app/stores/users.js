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

import Ember from 'ember';
import Store from 'emflux/store';
import { getStore } from 'emflux/dispatcher';
import { calcMsgHistorySize } from '../utils/msg-history-sizer';
import User from '../models/user';
import IndexArray from '../utils/index-array';

export default Store.extend({
    users: IndexArray.create({ index: 'userId', factory: User }),
    isDirty: 0,

    toJSON() {
        let data = {
            version: 2,
            users: {}
        };

        // Only persist users of recent messages
        getStore('windows').get('windows').forEach(function(masWindow) {
            let sortedMessages = masWindow.get('messages').sortBy('ts')
                .slice(-1 * calcMsgHistorySize());

            sortedMessages.forEach(function(message) {
                let userId = message.get('userId');

                if (userId) {
                    data.users[userId] = true;
                }
            });
        });

        for (let userId in data.users) {
            let user = this.get('users').getByIndex(userId);
            data.users[userId] = user.getProperties([ 'userId', 'name', 'nick', 'gravatar' ]);
        }

        return data;
    },

    fromJSON(data) {
        if (data.version !== 2) {
            return;
        }

        for (let userId in data.users) {
            this.get('users').upsertModel(data[userId]);
        }

        this.incrementProperty('isDirty');
    },

    handleAddUsersServer(data) {
        for (let userId in data.mapping) {
            let user = data.mapping[userId];
            user.userId = userId;

            this.get('users').upsertModel(user);
        }

        this.incrementProperty('isDirty');
    }
});
