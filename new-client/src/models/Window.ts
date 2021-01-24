import { computed, observable, makeObservable } from 'mobx';
import dayjs from 'dayjs';
import isMobile from 'ismobilejs';
import MessageModel from './Message';
import UserModel, { systemUser, ircSystemUser } from './User';
import { AlertsRecord, Network, WindowType, UpdatableWindowRecord } from '../types/notifications';

export default class WindowModel {
  messages = new Map<number, MessageModel>();
  logMessages = new Map<number, MessageModel>();
  actualDesktop = 0;
  newMessagesCount = 0;
  notDelivered = false;
  minimizedNamesList = false;

  operators: Array<UserModel> = [];
  voices: Array<UserModel> = [];
  users: Array<UserModel> = [];

  constructor(
    public readonly windowId: number,
    public readonly peerUser: UserModel | null,
    public readonly network: Network,
    public readonly type: WindowType,
    public generation: string,
    public topic: string | null,
    public name: string | null,
    public row: number,
    public column: number,
    public password: string | null,
    public alerts: AlertsRecord,
    public role: string
  ) {
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
  }

  get desktop(): number {
    return this.actualDesktop;
  }

  set desktop(value: number) {
    this.actualDesktop = isMobile().any ? Math.floor(Math.random() * 10000000) : value;
  }

  get sortedMessages(): Array<MessageModel> {
    const result = Array.from(this.messages.values()).sort((a, b) => (a.ts === b.ts ? a.gid - b.gid : a.ts - b.ts));
    let gid = -1;

    const addDayDivider = (array: Array<MessageModel>, dateString: string, index: number) => {
      array.splice(index, 0, new MessageModel(gid--, dateString, 'day-divider', 0, systemUser, this));
    };

    let dayOfNextMsg = dayjs().format('dddd, MMMM D');

    for (let i = result.length - 1; i >= 0; i--) {
      const day = dayjs.unix(result[i].ts).format('dddd, MMMM D');

      if (day !== dayOfNextMsg) {
        addDayDivider(result, dayOfNextMsg, i + 1);
        dayOfNextMsg = day;
      }
    }

    return result;
  }

  get sortedLogMessages(): Array<MessageModel> {
    return Array.from(this.logMessages.values()).sort((a, b) => a.ts - b.ts);
  }

  get operatorNames(): { nick: string; gravatar: string }[] {
    return this._mapUserToNicks('operators');
  }

  get voiceNames(): { nick: string; gravatar: string }[] {
    return this._mapUserToNicks('voices');
  }

  get userNames(): { nick: string; gravatar: string }[] {
    return this._mapUserToNicks('users');
  }

  get decoratedTitle(): string {
    let title = '';
    const type = this.type;
    const network = this.network;
    const name = this.name;

    if (type === '1on1' && this.peerUser === ircSystemUser) {
      title = `${network} Server Messages`;
    } else if (type === '1on1' && this.peerUser) {
      const ircNetwork = network === 'mas' ? '' : `${network} `;
      const target = this.peerUser.nick[network];
      title = `Private ${ircNetwork} conversation with ${target}`;
    } else if (network === 'mas') {
      title = `Group: ${name?.charAt(0).toUpperCase()}${name?.substr(1)}`;
    } else {
      title = `${network}: ${name}`;
    }

    return title;
  }

  get decoratedTopic(): string {
    return this.topic ? `- ${this.topic}` : '';
  }

  get simplifiedName(): string {
    if (this.type === 'group') {
      return this?.name?.replace(/[&/\\#,+()$~%.'":*?<>{}]/g, '') || 'group';
    } else {
      return this.peerUser ? this.peerUser.nick[this.network] || '1on1' : '1on1';
    }
  }

  get tooltipTopic(): string {
    const topic = this.topic;
    return topic ? `Topic: ${topic}` : 'Topic not set.';
  }

  get explainedType(): string {
    const type = this.type;
    const network = this.network;

    if (type === 'group') {
      return network === 'mas' ? 'group' : 'channel';
    }
    return '1on1';
  }

  updateGeneration(generation: string): void {
    this.generation = generation;
  }

  updateFromRecord(record: UpdatableWindowRecord): void {
    this.password = typeof record.password !== 'undefined' ? record.password : this.password;
    this.topic = typeof record.topic !== 'undefined' ? record.topic : this.topic;
    this.row = typeof record.row !== 'undefined' ? record.row : this.row;
    this.column = typeof record.column !== 'undefined' ? record.column : this.column;
    this.desktop = typeof record.desktop !== 'undefined' ? record.desktop : this.desktop;
    this.minimizedNamesList =
      typeof record.minimizedNamesList !== 'undefined' ? record.minimizedNamesList : this.minimizedNamesList;
    this.alerts.email = typeof record.alerts?.email !== 'undefined' ? record.alerts.email : this.alerts.email;
    this.alerts.notification =
      typeof record.alerts?.notification !== 'undefined' ? record.alerts.notification : this.alerts.notification;
    this.alerts.sound = typeof record.alerts?.sound !== 'undefined' ? record.alerts.sound : this.alerts.sound;
    this.alerts.title = typeof record.alerts?.title !== 'undefined' ? record.alerts.title : this.alerts.title;
  }

  _mapUserToNicks(role: 'operators' | 'voices' | 'users'): { nick: string; gravatar: string }[] {
    return this[role]
      .map(user => ({
        nick: user.nick[this.network] || 'unknown',
        gravatar: user.gravatar
      }))
      .sort((a, b) => a.nick.localeCompare(b.nick));
  }
}
