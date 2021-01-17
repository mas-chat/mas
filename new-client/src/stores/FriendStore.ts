import { observable, makeObservable, action } from 'mobx';
import userStore from './UserStore';
import alertStore from './AlertStore';
import modalStore from './ModalStore';
import FriendModel from '../models/Friend';
import socket from '../lib/socket';
import { Notification } from '../types/notifications';
import { FriendVerdictRequest, RequestFriendRequest } from '../types/requests';

class FriendStore {
  friends = new Map<string, FriendModel>();

  constructor() {
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
      this.friends.set(friend.userId, new FriendModel(friend.userId, friend.online, friend.last));
    });
  }

  confirmFriends(friends: Array<{ userId: string }>) {
    for (const friendCandidate of friends) {
      const userId = friendCandidate.userId;
      const user = userStore.users.get(userId);

      if (!user) {
        return;
      }

      const message = `Allow ${user.name} (${user.nick.mas}) to add you to his/her contacts list?`;

      alertStore.showAlert(null, message, 'Allow', 'Ignore', 'Decide later', result => {
        if (result === 'ack' || result === 'nack') {
          socket.send<FriendVerdictRequest>({
            id: 'FRIEND_VERDICT',
            userId,
            allow: result === 'ack'
          });
        }
      });
    }
  }

  confirmRemoveFriend(userId: string) {
    modalStore.openModal('remove-friend-modal', { userId });
  }

  async requestFriend(userId: string) {
    const response = await socket.send<RequestFriendRequest>({
      id: 'REQUEST_FRIEND',
      userId
    });

    const message =
      response.status === 'OK'
        ? 'Request sent. Contact will added to your list when he or she approves.'
        : response.errorMsg;

    alertStore.showAlert(null, message, 'Okay', false, false);
  }

  removeFriend(userId: string) {
    socket.send({ id: 'REMOVE_FRIEND', userId });
  }
}

export default new FriendStore();
