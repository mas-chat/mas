import { observable, makeObservable, computed } from 'mobx';
import UserModel, { systemUser, me, ircSystemUser } from '../models/User';
import { Notification } from '../types/notifications';
import { getUserId } from '../lib/cookie';
import RootStore from './RootStore';
import Socket from '../lib/socket';

class UserStore {
  rootStore: RootStore;
  socket: Socket;
  users = new Map<string, UserModel>([
    [getUserId(), me],
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

  myNick(network: 'mas' | 'ircnet' | 'freenode' | 'w3c'): string | undefined {
    return this.me.nick[network];
  }

  get me(): UserModel {
    return this.users.get(getUserId()) as UserModel;
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

  upsertUsers(
    mapping: Record<
      string,
      { name: string; gravatar: string; nick: { mas: string; ircnet?: string; freenode?: string; w3c?: string } }
    >
  ): void {
    Object.entries(mapping).forEach(([userId, user]) => {
      const existingUser = this.users.get(userId);

      if (existingUser) {
        existingUser.updateFromRecord(user);
      } else {
        this.users.set(userId, new UserModel(user.nick, user.name, user.gravatar));
      }
    });
  }
}

export default UserStore;
