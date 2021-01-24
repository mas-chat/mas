import { observable, makeObservable } from 'mobx';
import { UserRecord } from '../types/notifications';

const SYSTEM_USER_NICK = 'system';
const SYSTEM_USER_NAME = 'System User';
const SYSTEM_USER_GRAVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000';

export default class UserModel {
  constructor(
    public nick: { mas: string; IRCNet?: string; FreeNode?: string; W3C?: string },
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
    this.nick.IRCNet = typeof record.nick.IRCNet !== 'undefined' ? record.nick.IRCNet : this.nick.IRCNet;
    this.nick.FreeNode = typeof record.nick.FreeNode !== 'undefined' ? record.nick.FreeNode : this.nick.FreeNode;
    this.nick.W3C = typeof record.nick.FreeNode !== 'undefined' ? record.nick.W3C : this.nick.W3C;
  }
}

export const systemUser = new UserModel(
  {
    mas: SYSTEM_USER_NICK,
    IRCNet: SYSTEM_USER_NICK,
    FreeNode: SYSTEM_USER_NICK,
    W3C: SYSTEM_USER_NICK
  },
  SYSTEM_USER_NAME,
  SYSTEM_USER_GRAVATAR
);

export const ircSystemUser = new UserModel(
  {
    mas: SYSTEM_USER_NICK,
    IRCNet: SYSTEM_USER_NICK,
    FreeNode: SYSTEM_USER_NICK,
    W3C: SYSTEM_USER_NICK
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
