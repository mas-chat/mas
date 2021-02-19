import { computed, observable, makeObservable } from 'mobx';
import { getUserId } from '../lib/cookie';
import { UserRecord } from '../types/notifications';

const SYSTEM_USER_NICK = 'system';
const SYSTEM_USER_NAME = 'System User';
const DEFAULT_GRAVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000';

export type UserModelProps = {
  id: string;
  nick: { mas: string; ircnet?: string; freenode?: string; w3c?: string };
  name?: string;
  gravatar?: string;
};

export default class UserModel {
  public readonly id: string;
  public nick: { mas: string; ircnet?: string; freenode?: string; w3c?: string };
  public name: string;
  public gravatar: string;

  constructor({ id, nick, name, gravatar }: UserModelProps) {
    this.id = id;
    this.nick = nick;
    this.name = name || 'anonymous';
    this.gravatar = gravatar || DEFAULT_GRAVATAR;

    makeObservable(this, {
      nick: observable,
      name: observable,
      gravatar: observable,
      gravatarUrl: computed
    });
  }

  get gravatarUrl(): string {
    return `//gravatar.com/avatar/${this.gravatar}?d=mm`;
  }

  updateFromRecord(record: UserRecord): void {
    this.name = record.name ?? this.name;
    this.gravatar = record.gravatar ?? this.gravatar;
    this.nick.mas = record.nick.mas ?? this.nick.mas;
    this.nick.ircnet = record.nick.ircnet ?? this.nick.ircnet;
    this.nick.freenode = record.nick.freenode ?? this.nick.freenode;
    this.nick.w3c = record.nick.w3c ?? this.nick.w3c;
  }
}

export const systemUser = new UserModel({
  id: 'm0',
  nick: {
    mas: SYSTEM_USER_NICK,
    ircnet: SYSTEM_USER_NICK,
    freenode: SYSTEM_USER_NICK,
    w3c: SYSTEM_USER_NICK
  },
  name: SYSTEM_USER_NAME,
  gravatar: DEFAULT_GRAVATAR
});

export const ircSystemUser = new UserModel({
  id: 'i0',
  nick: {
    mas: SYSTEM_USER_NICK,
    ircnet: SYSTEM_USER_NICK,
    freenode: SYSTEM_USER_NICK,
    w3c: SYSTEM_USER_NICK
  },
  name: SYSTEM_USER_NAME,
  gravatar: DEFAULT_GRAVATAR
});

export const me = new UserModel({
  id: getUserId(),
  nick: {
    mas: 'loading'
  },
  name: 'Loading...',
  gravatar: DEFAULT_GRAVATAR
});
