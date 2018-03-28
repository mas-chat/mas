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

import Store from './base';
import Cookies from 'npm:js-cookie';
import { calcMsgHistorySize } from '../utils/msg-history-sizer';
import User from '../models/user';
import IndexArray from '../utils/index-array';

const UsersStore = Store.extend({
  users: IndexArray.create({ index: 'userId', factory: User }),
  isDirty: 0,
  userId: null,

  init() {
    try {
      // TODO: Should read this from initok request but that's too late
      this.userId = `m${JSON.parse(window.atob(Cookies.get('mas'))).userId}`;
    } catch (e) {
      this.userId = null;
    }

    this._super();
  },

  toJSON() {
    const data = {
      version: 4,
      users: {},
      userId: this.get('userId')
    };

    // Only persist users of recent messages
    window.stores.windows.get('windows').forEach(masWindow => {
      const sortedMessages = masWindow
        .get('messages')
        .sortBy('gid')
        .slice(-1 * calcMsgHistorySize());

      sortedMessages.forEach(message => {
        const userId = message.get('userId');

        if (userId) {
          data.users[userId] = true;
        }
      });
    });

    // Always save user itself
    data.users[this.get('userId')] = true;

    for (const userId in data.users) {
      const user = this.get('users').getByIndex(userId);
      data.users[userId] = user.getProperties(['userId', 'name', 'nick', 'gravatar']);
    }

    return data;
  },

  fromJSON(data) {
    if (data.userId !== this.get('userId') || data.version !== 4) {
      return;
    }

    for (const userId in data.users) {
      this.get('users').upsertModel(data.users[userId]);
    }

    this.incrementProperty('isDirty');
  },

  handleAddUsersServer(data) {
    for (const userId in data.mapping) {
      const user = data.mapping[userId];
      user.userId = userId;

      this.get('users').upsertModel(user);
    }

    this.incrementProperty('isDirty');
  }
});

window.stores = window.stores || {};
window.stores.users = UsersStore.create();
