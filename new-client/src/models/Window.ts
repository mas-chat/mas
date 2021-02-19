import { computed, observable, makeObservable } from 'mobx';
import MessageModel from './Message';
import UserModel, { ircSystemUser } from './User';
import { AlertsRecord, Network, Role, WindowType, UpdatableWindowRecord } from '../types/notifications';

export type WindowModelProps = {
  id: number;
  peerUser?: UserModel;
  network: Network;
  operators?: Array<UserModel>;
  voices?: Array<UserModel>;
  users?: Array<UserModel>;
  type: WindowType;
  desktopId: number;
  generation: string;
  topic?: string | null;
  name?: string;
  row: number;
  column: number;
  password?: string;
  alerts: AlertsRecord;
  role: Role;
  isMemberListVisible: boolean;
};

export default class WindowModel {
  public readonly id: number;
  public readonly peerUser?: UserModel;
  public readonly network: Network;
  public readonly type: WindowType;
  public desktopId: number;
  public generation: string;
  public topic?: string | null;
  public name?: string;
  public row: number;
  public column: number;
  public password?: string;
  public alerts: AlertsRecord;
  public role: Role;

  messages = new Map<number, MessageModel>();
  logMessages = new Map<number, MessageModel>();
  newMessagesCount = 0;
  notDelivered = false;
  isMemberListVisible = false;

  operators: Array<UserModel>;
  voices: Array<UserModel>;
  users: Array<UserModel>;

  constructor({
    id,
    peerUser,
    network,
    operators,
    voices,
    users,
    type,
    desktopId,
    generation,
    topic,
    name,
    row,
    column,
    password,
    alerts,
    role,
    isMemberListVisible
  }: WindowModelProps) {
    this.id = id;
    this.peerUser = peerUser;
    this.network = network;
    this.operators = operators || [];
    this.voices = voices || [];
    this.users = users || [];
    this.type = type;
    this.desktopId = desktopId;
    this.generation = generation;
    this.topic = topic;
    this.name = name;
    this.row = row;
    this.column = column;
    this.password = password;
    this.alerts = alerts;
    this.role = role;
    this.isMemberListVisible = isMemberListVisible;

    makeObservable(this, {
      desktopId: observable,
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
      role: observable,
      isMemberListVisible: observable,
      sortedMessages: computed,
      sortedLogMessages: computed,
      participants: computed,
      decoratedTitle: computed,
      decoratedTopic: computed,
      simplifiedName: computed,
      tooltipTopic: computed,
      explainedType: computed
    });
  }

  updateFromRecord(record: UpdatableWindowRecord): void {
    this.password = record.password ?? this.password;
    this.topic = record.topic ?? this.topic;
    this.row = record.row ?? this.row;
    this.column = record.column ?? this.column;
    this.desktopId = record.desktop ?? this.desktopId;
    this.alerts.email = record.alerts?.email ?? this.alerts.email;
    this.alerts.notification = record.alerts?.notification ?? this.alerts.notification;
    this.alerts.sound = record.alerts?.sound ?? this.alerts.sound;
    this.alerts.title = record.alerts?.title ?? this.alerts.title;
    this.isMemberListVisible =
      typeof record.minimizedNamesList === 'boolean' ? !record.minimizedNamesList : this.isMemberListVisible;
  }

  get sortedMessages(): Array<MessageModel> {
    return Array.from(this.messages.values()).sort((a, b) => (a.ts === b.ts ? a.gid - b.gid : a.ts - b.ts));
  }

  get sortedLogMessages(): Array<MessageModel> {
    return Array.from(this.logMessages.values()).sort((a, b) => a.ts - b.ts);
  }

  get participants(): Map<string, UserModel> {
    const participants = [...this.operators, ...this.voices, ...this.users];
    const sortedParticipantsByNick: Array<[string, UserModel]> = participants
      .sort((a, b) => a.nick[this.network]?.localeCompare(b.nick[this.network] as string) || 0)
      .map(user => [user.nick[this.network] as string, user]);

    return new Map<string, UserModel>(sortedParticipantsByNick);
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
}
