import { observable, makeObservable, computed } from 'mobx';
import UserModel, { systemUser, me, ircSystemUser } from '../models/User';
import { Notification } from '../types/notifications';
import { userId } from '../lib/cookie';
import RootStore from './RootStore';
import Socket from '../lib/socket';

class UserStore {
  rootStore: RootStore;
  socket: Socket;
  users = new Map<string, UserModel>([
    [userId, me],
    ['m0', systemUser],
    ['i0', ircSystemUser]
  ]);

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      users: observable,
      me: computed
    });
  }

  myNick(network: 'mas' | 'IRCNet' | 'FreeNode' | 'W3C') {
    this.me.nick[network];
  }

  get me() {
    return this.users.get(userId) as UserModel;
  }

  upsertUsers(
    mapping: Record<
      string,
      { name: string; gravatar: string; nick: { mas: string; IRCNet?: string; FreeNode?: string; W3C?: string } }
    >
  ) {
    Object.entries(mapping).forEach(([userId, user]) => {
      this.users.set(userId, new UserModel(user.nick, user.name, user.gravatar));
    });
  }

  handlerServerNotification(ntf: Notification): boolean {
    switch (ntf.type) {
      case 'ADD_USERS':
        this.upsertUsers(ntf.mapping);
        break;
      default:
        return false;
    }

    return true;
  }
}

export default UserStore;
