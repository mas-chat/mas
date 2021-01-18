import { observable, makeObservable } from 'mobx';

const SYSTEM_USER_NICK = 'system';
const SYSTEM_USER_NAME = 'System User';
const SYSTEM_USER_GRAVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000';

export default class UserModel {
  constructor(
    public readonly nick: { mas: string; IRCNet?: string; FreeNode?: string; W3C?: string },
    public readonly name: string,
    public readonly gravatar: string
  ) {
    makeObservable(this, {
      nick: observable,
      name: observable,
      gravatar: observable
    });
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
