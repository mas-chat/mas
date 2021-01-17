import { observable, makeObservable, computed } from 'mobx';
import Cookies from 'js-cookie';
import UserModel from '../models/User';
import { Notification } from '../types/notifications';

class UserStore {
  users = new Map<string, UserModel>();
  userId: string;

  constructor() {
    makeObservable(this, {
      users: observable
    });

    // TODO: Should read this from initok request but that's too late
    const encodedUserId = Cookies.get('mas');

    if (!encodedUserId) {
      throw 'Cookie not found.';
    }

    this.userId = `m${JSON.parse(window.atob(encodedUserId)).userId}`;
  }

  myNick(network: 'mas' | 'IRCNet' | 'FreeNode' | 'W3C') {
    if (!this.userId) {
      return null;
    }

    this.users.get(this.userId)?.nick[network];
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

export default new UserStore();
