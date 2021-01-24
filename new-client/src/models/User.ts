import { observable, makeObservable } from 'mobx';
import { UserRecord } from '../types/notifications';

const SYSTEM_USER_NICK = 'system';
const SYSTEM_USER_NAME = 'System User';
const SYSTEM_USER_GRAVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000';

export default class UserModel {
  constructor(
    public nick: { mas: string; ircnet?: string; freenode?: string; w3c?: string },
    public name: string,
    public gravatar: string
  ) {
    makeObservable(this, {
      nick: observable,
      name: observable,
      gravatar: observable
    });
  }

  updateFromRecord(record: UserRecord): void {
    this.name = typeof record.name !== 'undefined' ? record.name : this.name;
    this.gravatar = typeof record.gravatar !== 'undefined' ? record.gravatar : this.gravatar;
    this.nick.mas = typeof record.nick.mas !== 'undefined' ? record.nick.mas : this.nick.mas;
    this.nick.ircnet = typeof record.nick.ircnet !== 'undefined' ? record.nick.ircnet : this.nick.ircnet;
    this.nick.freenode = typeof record.nick.freenode !== 'undefined' ? record.nick.freenode : this.nick.freenode;
    this.nick.w3c = typeof record.nick.w3c !== 'undefined' ? record.nick.w3c : this.nick.w3c;
  }
}

export const systemUser = new UserModel(
  {
    mas: SYSTEM_USER_NICK,
    ircnet: SYSTEM_USER_NICK,
    freenode: SYSTEM_USER_NICK,
    w3c: SYSTEM_USER_NICK
  },
  SYSTEM_USER_NAME,
  SYSTEM_USER_GRAVATAR
);

export const ircSystemUser = new UserModel(
  {
    mas: SYSTEM_USER_NICK,
    ircnet: SYSTEM_USER_NICK,
    freenode: SYSTEM_USER_NICK,
    w3c: SYSTEM_USER_NICK
  },
  SYSTEM_USER_NAME,
  SYSTEM_USER_GRAVATAR
);

export const me = new UserModel(
  {
    mas: 'loading'
  },
  'Loading...',
  'Loading...'
);
