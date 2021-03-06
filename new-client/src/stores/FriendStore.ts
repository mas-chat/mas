import { observable, makeObservable, action } from 'mobx';
import FriendModel from '../models/Friend';
import { ModalType } from '../models/Modal';
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

  updateFriends(reset: boolean, friends: Array<{ userId: string; online: boolean; last?: number }>): void {
    if (reset) {
      this.friends.clear();
    }

    friends.forEach(friend => {
      const user = this.rootStore.userStore.users.get(friend.userId);

      if (user) {
        this.friends.set(friend.userId, new FriendModel({ user, online: friend.online, last: friend.last }));
      }
    });
  }

  confirmFriends(friends: Array<{ userId: string }>): void {
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

  confirmRemoveFriend(userId: string): void {
    const user = this.rootStore.userStore.users.get(userId);

    if (!user) {
      return;
    }

    this.rootStore.modalStore.openModal({
      type: ModalType.Info,
      title: 'Remove contact from the list',
      body: `Are you sure you want to remove ${user.name} (${user.nick['mas']}) from the contacts list?`,
      action: {
        executedButton: 'Remove',
        cancelButton: 'Cancel',
        submit: () => {
          this.removeFriend(userId);
        }
      }
    });
  }

  async requestFriend(userId: string): Promise<void> {
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

  removeFriend(userId: string): void {
    this.socket.send({ id: 'REMOVE_FRIEND', userId });
  }
}

export default FriendStore;
