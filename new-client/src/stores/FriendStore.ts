import { observable, makeObservable, action } from 'mobx';
import FriendModel from '../models/Friend';
import { Notification } from '../types/notifications';
import { FriendVerdictRequest, RequestFriendRequest } from '../types/requests';
import RootStore from './RootStore';
import Socket from '../lib/socket';

class FriendStore {
  rootStore: RootStore;
  socket: Socket;
  friends = new Map<string, FriendModel>();

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      friends: observable,
      updateFriends: action
    });
  }

  handlerServerNotification(ntf: Notification): boolean {
    switch (ntf.type) {
      case 'UPDATE_FRIENDS':
        this.updateFriends(ntf.reset, ntf.friends);
        break;
      case 'CONFIRM_FRIENDS':
        this.confirmFriends(ntf.friends);
        break;
      default:
        return false;
    }

    return true;
  }

  updateFriends(reset: boolean, friends: Array<{ userId: string; online: boolean; last?: number }>) {
    if (reset) {
      this.friends.clear();
    }

    friends.forEach(friend => {
      const user = this.rootStore.userStore.users.get(friend.userId);

      if (user) {
        this.friends.set(friend.userId, new FriendModel(user, friend.online, friend.last));
      }
    });
  }

  confirmFriends(friends: Array<{ userId: string }>) {
    for (const friendCandidate of friends) {
      const userId = friendCandidate.userId;
      const user = this.rootStore.userStore.users.get(userId);

      if (!user) {
        return;
      }

      const message = `Allow ${user.name} (${user.nick.mas}) to add you to his/her contacts list?`;

      this.rootStore.alertStore.showAlert(null, message, 'Allow', 'Ignore', 'Decide later', result => {
        if (result === 'ack' || result === 'nack') {
          this.socket.send<FriendVerdictRequest>({
            id: 'FRIEND_VERDICT',
            userId,
            allow: result === 'ack'
          });
        }
      });
    }
  }

  confirmRemoveFriend(userId: string) {
    this.rootStore.modalStore.openModal('remove-friend-modal', { userId });
  }

  async requestFriend(userId: string) {
    const response = await this.socket.send<RequestFriendRequest>({
      id: 'REQUEST_FRIEND',
      userId
    });

    const message =
      response.status === 'OK'
        ? 'Request sent. Contact will added to your list when he or she approves.'
        : response.errorMsg;

    this.rootStore.alertStore.showAlert(null, message, 'Okay', false, false);
  }

  removeFriend(userId: string) {
    this.socket.send({ id: 'REMOVE_FRIEND', userId });
  }
}

export default FriendStore;
