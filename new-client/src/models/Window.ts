import { computed, observable, autorun, makeObservable } from 'mobx';
import moment from 'moment';
import isMobile from 'ismobilejs';
import Message from './Message';
import daySeparatorStore from '../stores/DaySeparatorStore';
import settingStore from '../stores/SettingStore';
import userStore from '../stores/UserStore';

export default class WindowModel {
  windowId = 0;
  userId = null;
  network = null;
  type = null;
  topic = '';
  name = null;
  row = 0;
  column = 0;
  password = null;

  alerts = {
    email: false,
    notification: false,
    sound: false,
    title: false
  };

  messages = new Map();
  logMessages = new Map();

  generation = '';
  newMessagesCount = 0;

  notDelivered = false;

  operators = [];
  voices = [];
  users = [];

  minimizedNamesList = false;
  actualDesktop = 0;

  constructor(store, props) {
    makeObservable(this, {
      topic: observable,
      name: observable,
      row: observable,
      column: observable,
      password: observable,
      alerts: observable,
      messages: observable,
      logMessages: observable,
      generation: observable,
      newMessagesCount: observable,
      notDelivered: observable,
      operators: observable,
      voices: observable,
      users: observable,
      minimizedNamesList: observable,
      actualDesktop: observable,
      desktop: computed,
      visible: computed,
      sortedMessages: computed,
      sortedLogMessages: computed,
      operatorNames: computed,
      voiceNames: computed,
      userNames: computed,
      decoratedTitle: computed,
      decoratedTopic: computed,
      simplifiedName: computed,
      tooltipTopic: computed,
      explainedType: computed
    });

    Object.assign(this, props);

    autorun(() => {
      if (this.visible) {
        this.newMessagesCount = 0;
      }
    });
  }

  get desktop() {
    return this.actualDesktop;
  }

  set desktop(value) {
    this.actualDesktop = isMobile().any ? Math.floor(Math.random() * 10000000) : value;
  }

  get visible() {
    return settingStore.settings.activeDesktop === this.actualDesktop;
  }

  get sortedMessages() {
    const result = Array.from(this.messages.values()).sort((a, b) => (a.ts === b.ts ? a.gid - b.gid : a.ts - b.ts));
    let gid = -1;

    const addDayDivider = (array, dateString, index) => {
      array.splice(
        index,
        0,
        new Message(this, {
          body: dateString,
          cat: 'day-divider',
          gid: gid--,
          window: this
        })
      );
    };

    let dayOfNextMsg = moment().format('dddd, MMMM D');

    for (let i = result.length - 1; i >= 0; i--) {
      const day = moment.unix(result[i].ts).format('dddd, MMMM D');

      if (day !== dayOfNextMsg) {
        addDayDivider(result, dayOfNextMsg, i + 1);
        dayOfNextMsg = day;
      }
    }

    return result;
  }

  get sortedLogMessages() {
    return Array.from(this.logMessages.values()).sort((a, b) => a.ts - b.ts);
  }

  get operatorNames() {
    return this._mapUserIdsToNicks('operators');
  }

  get voiceNames() {
    return this._mapUserIdsToNicks('voices');
  }

  get userNames() {
    return this._mapUserIdsToNicks('users');
  }

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

  get decoratedTopic() {
    return this.topic ? `- ${this.topic}` : '';
  }

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

  get tooltipTopic() {
    const topic = this.topic;
    return topic ? `Topic: ${topic}` : 'Topic not set.';
  }

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
