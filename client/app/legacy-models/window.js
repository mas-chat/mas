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

import Mobx from 'mobx';
import EmberObject, { computed } from '@ember/object';
import { A } from '@ember/array';
import moment from 'moment';
import isMobile from 'ismobilejs';
import BaseModel from './base';
import Message from './message';
import daySeparatorStore from '../stores/DaySeparatorStore';
import userStore from '../stores/UserStore';
import IndexArray from '../utils/index-array';

const { autorun } = Mobx;

let mobileDesktop = 1;

function monitor(name, ...args) {
  autorun(() => this.set(name, args[args.length - 1].call(this)));
  return computed(...args);
}

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

  _windowsStore: null,

  init() {
    this._super();

    this.set('_windowsStore', window.stores.windows);

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

    autorun(() => {
      this.set('dayCounter', daySeparatorStore.dayCounter);

      const nick = userStore.users.get(userStore.userId).nick[this.network];
      this.set('userNickHighlightRegex', new RegExp(`(^|[@ ])${nick}[ :]`));
    });
  },

  desktop: computed('_desktop', {
    get() {
      return this._desktop;
    },
    set(key, value) {
      if (!isMobile.any) {
        this.set('_desktop', value);
      }

      return this._desktop;
    }
  }),

  sortedMessages: computed('messages.[]', 'dayCounter', function() {
    const result = this.messages.sortBy('gid');

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

  operatorNames: monitor('operatorNames', 'operators.[]', function() {
    return this._mapUserIdsToNicks('operators');
  }),

  voiceNames: monitor('voiceNames', 'voices.[]', function() {
    return this._mapUserIdsToNicks('voices');
  }),

  userNames: monitor('userNames', 'users.[]', function() {
    return this._mapUserIdsToNicks('users');
  }),

  decoratedTitle: computed('name', 'network', 'type', function() {
    let title;
    const type = this.type;
    const userId = this.userId;
    const network = this.network;
    const name = this.name;

    if (type === '1on1' && userId === 'i0') {
      title = `${network} Server Messages`;
    } else if (type === '1on1') {
      const ircNetwork = network === 'MAS' ? '' : `${network} `;
      const peerUser = userStore.users.get(userId);

      const target = peerUser ? peerUser.nick[network] : 'person';
      title = `Private ${ircNetwork} conversation with ${target}`;
    } else if (network === 'MAS') {
      title = `Group: ${name.charAt(0).toUpperCase()}${name.substr(1)}`;
    } else {
      title = `${network}: ${name}`;
    }

    return title;
  }),

  decoratedTopic: computed('topic', function() {
    return this.topic ? `- ${this.topic}` : '';
  }),

  simplifiedName: computed('name', function() {
    let windowName = this.name;
    const network = this.network;
    const type = this.type;

    if (type === 'group') {
      windowName = windowName.replace(/[&/\\#,+()$~%.'":*?<>{}]/g, '');
    } else {
      const userId = this.userId;
      const peerUser = userStore.users.get(userId);

      windowName = peerUser ? peerUser.nick[network] : '1on1';
    }
    return windowName;
  }),

  tooltipTopic: computed('topic', function() {
    const topic = this.topic;
    return topic ? `Topic: ${topic}` : 'Topic not set.';
  }),

  explainedType: computed('type', function() {
    const type = this.type;
    const network = this.network;

    if (type === 'group') {
      return network === 'MAS' ? 'group' : 'channel';
    }
    return '1on1';
  }),

  _mapUserIdsToNicks(role) {
    return this.get(role)
      .map(userId => {
        const user = userStore.users.get(userId);

        return {
          userId,
          nick: user.nick[this.network],
          gravatar: user.gravatar
        };
      })
      .sort((a, b) => a.nick - b.nick);
  }
});
