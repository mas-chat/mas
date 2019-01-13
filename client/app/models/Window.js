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

import Mobx, { observable } from 'mobx';
import moment from 'moment';
import isMobile from 'ismobilejs';
import Message from './Message';
import daySeparatorStore from '../stores/DaySeparatorStore';
import userStore from '../stores/UserStore';

const { computed } = Mobx;

let mobileDesktop = 1;

export default class WindowModel {
  windowId = 0;
  userId = null;
  network = null;
  type = null;
  @observable topic = '';
  @observable name = null;
  @observable row = 0;
  @observable column = 0;
  @observable password = null;

  @observable
  alerts = {
    email: false,
    notification: false,
    sound: false,
    title: false
  };
  @observable desktop;

  @observable messages = new Map();
  @observable logMessages = new Map();

  generation = '';
  didPrepend = false;
  newMessagesCount = 0;

  @observable operators = [];
  @observable voices = [];
  @observable users = [];

  @observable minimizedNamesList = false;

  @observable Internaldesktop = mobileDesktop++;

  constructor(store, props) {
    // delete props.desktop;

    Object.assign(this, props);
  }

  // @computed
  // get desktop() {
  //   return this.Internaldesktop;
  // }

  // @computed
  // set desktop(value) {
  //   if (!isMobile.any) {
  //     this.Internaldesktop = value;
  //   }
  // }

  @computed
  get sortedMessages() {
    const result = Array.from(this.messages.values()).sort((a, b) => a.gid > b.gid);

    const addDayDivider = (array, dateString, index) => {
      // TODO:
      // this.set('dayCounter', daySeparatorStore.dayCounter);

      array.splice(
        index,
        0,
        new Message(this, {
          // TODO: This is wrong
          body: dateString,
          cat: 'day-divider',
          gid: 0,
          window: this
        })
      );
    };

    let dayOfNextMsg = moment().format('dddd, MMMM D');

    for (let i = result.length - 1; i >= 0; i--) {
      const ts = moment.unix(result[i].ts);
      const day = ts.format('dddd, MMMM D');

      if (day !== dayOfNextMsg) {
        addDayDivider(result, dayOfNextMsg, i + 1);
        dayOfNextMsg = day;
      }
    }

    return result;
  }

  @computed
  get operatorNames() {
    return this._mapUserIdsToNicks('operators');
  }

  @computed
  get voiceNames() {
    return this._mapUserIdsToNicks('voices');
  }

  @computed
  get userNames() {
    return this._mapUserIdsToNicks('users');
  }

  @computed
  get decoratedTitle() {
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
  }

  @computed
  get decoratedTopic() {
    return this.topic ? `- ${this.topic}` : '';
  }

  @computed
  get simplifiedName() {
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
  }

  @computed
  get tooltipTopic() {
    const topic = this.topic;
    return topic ? `Topic: ${topic}` : 'Topic not set.';
  }

  @computed
  get explainedType() {
    const type = this.type;
    const network = this.network;

    if (type === 'group') {
      return network === 'MAS' ? 'group' : 'channel';
    }
    return '1on1';
  }

  _mapUserIdsToNicks(role) {
    return this[role]
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
}
