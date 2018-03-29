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

import EmberObject, { computed } from '@ember/object';
import { A } from '@ember/array';
import moment from 'npm:moment';
import isMobile from 'npm:ismobilejs';
import BaseModel from './base';
import Message from './message';
import IndexArray from '../utils/index-array';

let mobileDesktop = 1;

export default BaseModel.extend({
  windowId: 0,
  generation: '',
  name: null,
  userId: null,
  network: null,
  type: null,

  row: 0,
  column: 0,

  messages: null,
  didPrepend: false,
  logMessages: null,

  newMessagesCount: 0,
  alerts: null,

  operators: null,
  voices: null,
  users: null,

  minimizedNamesList: false,

  password: null,

  _desktop: null,

  _dayServiceStore: null,
  _windowsStore: null,
  _usersStore: null,

  init() {
    this._super();

    this.set('_dayServiceStore', window.stores['day-service']);
    this.set('_windowsStore', window.stores.windows);
    this.set('_usersStore', window.stores.users);

    this.set('_desktop', mobileDesktop++);

    this.set('messages', IndexArray.create({ index: 'gid', factory: Message }));
    this.set('logMessages', IndexArray.create({ index: 'gid', factory: Message }));

    this.set('operators', A([]));
    this.set('voices', A([]));
    this.set('users', A([]));

    this.set(
      'alerts',
      EmberObject.create({
        email: false,
        notification: false,
        sound: false,
        title: false
      })
    );
  },

  desktop: computed('_desktop', {
    get() {
      return this.get('_desktop');
    },
    set(key, value) {
      if (!isMobile.any) {
        this.set('_desktop', value);
      }

      return this.get('_desktop');
    }
  }),

  sortedMessages: computed('messages.[]', '_dayServiceStore.dayCounter', function() {
    const result = this.get('messages').sortBy('gid');

    const addDayDivider = (array, dateString, index) => {
      array.splice(
        index,
        0,
        Message.create({
          body: dateString,
          cat: 'day-divider',
          gid: 0,
          window: this
        })
      );
    };

    let dayOfNextMsg = moment().format('dddd, MMMM D');

    for (let i = result.length - 1; i >= 0; i--) {
      const ts = moment.unix(result[i].get('ts'));
      const day = ts.format('dddd, MMMM D');

      if (day !== dayOfNextMsg) {
        addDayDivider(result, dayOfNextMsg, i + 1);
        dayOfNextMsg = day;
      }
    }

    return result;
  }),

  userNickHighlightRegex: computed('_windowsStore.userId', '_usersStore.isDirty', function() {
    const userId = this.get('_windowsStore.userId');
    const nick = this.get('_usersStore.users')
      .getByIndex(userId)
      .get('nick')[this.get('network')];

    return new RegExp(`(^|[@ ])${nick}[ :]`);
  }),

  operatorNames: computed('operators.[]', '_usersStore.isDirty', function() {
    return this._mapUserIdsToNicks('operators').sortBy('nick');
  }),

  voiceNames: computed('voices.[]', '_usersStore.isDirty', function() {
    return this._mapUserIdsToNicks('voices').sortBy('nick');
  }),

  userNames: computed('users.[]', '_usersStore.isDirty', function() {
    return this._mapUserIdsToNicks('users').sortBy('nick');
  }),

  decoratedTitle: computed('name', 'network', 'type', '_usersStore.isDirty', function() {
    let title;
    const type = this.get('type');
    const userId = this.get('userId');
    const network = this.get('network');
    const name = this.get('name');

    if (type === '1on1' && userId === 'i0') {
      title = `${network} Server Messages`;
    } else if (type === '1on1') {
      const ircNetwork = network === 'MAS' ? '' : `${network} `;
      const peerUser = this.get('_usersStore.users').getByIndex(userId);

      const target = peerUser ? peerUser.get('nick')[network] : 'person';
      title = `Private ${ircNetwork} conversation with ${target}`;
    } else if (network === 'MAS') {
      title = `Group: ${name.charAt(0).toUpperCase()}${name.substr(1)}`;
    } else {
      title = `${network}: ${name}`;
    }

    return title;
  }),

  decoratedTopic: computed('topic', function() {
    return this.get('topic') ? `- ${this.get('topic')}` : '';
  }),

  simplifiedName: computed('name', function() {
    let windowName = this.get('name');
    const network = this.get('network');
    const type = this.get('type');

    if (type === 'group') {
      windowName = windowName.replace(/[&/\\#,+()$~%.'":*?<>{}]/g, '');
    } else {
      const userId = this.get('userId');
      const peerUser = this.get('_usersStore.users').getByIndex(userId);

      windowName = peerUser ? peerUser.get('nick')[network] : '1on1';
    }
    return windowName;
  }),

  tooltipTopic: computed('topic', function() {
    const topic = this.get('topic');
    return topic ? `Topic: ${topic}` : 'Topic not set.';
  }),

  explainedType: computed('type', function() {
    const type = this.get('type');
    const network = this.get('network');

    if (type === 'group') {
      return network === 'MAS' ? 'group' : 'channel';
    }
    return '1on1';
  }),

  _mapUserIdsToNicks(role) {
    return this.get(role).map(userId => {
      const user = this.get('_usersStore.users').getByIndex(userId);

      return {
        userId,
        nick: user.get('nick')[this.get('network')],
        gravatar: user.get('gravatar')
      };
    });
  }
});
