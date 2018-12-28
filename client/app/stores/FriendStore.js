import Mobx from 'mobx';
import { dispatch } from '../utils/dispatcher';
import userStore from './UserStore';
import FriendModel from '../models/Friend';
import socket from '../utils/socket';

const { observable } = Mobx;

class FriendStore {
  @observable friends = new Map();

  handleAddFriendsServer(data) {
    if (data.reset) {
      this.friends.clear();
    }

    data.friends.forEach(friend => {
      this.friends.set(friend.userId, new FriendModel(this, friend));
    });
  }

  handleConfirmRemoveFriend(data) {
    dispatch('OPEN_MODAL', {
      name: 'remove-friend-modal',
      model: data.userId
    });
  }

  handleRequestFriend(data) {
    socket.send(
      {
        id: 'REQUEST_FRIEND',
        userId: data.userId
      },
      resp => {
        const message =
          resp.status === 'OK'
            ? 'Request sent. Contact will added to your list when he or she approves.'
            : resp.errorMsg;

        dispatch('SHOW_ALERT', {
          alertId: `internal:${Date.now()}`,
          message,
          report: false,
          postponeLabel: false,
          ackLabel: 'Okay'
        });
      }
    );
  }

  handleConfirmFriendsServer(data) {
    for (const friendCandidate of data.friends) {
      const userId = friendCandidate.userId;
      const user = userStore.users.get(userId);
      const message = `Allow ${user.name} (${user.nick.mas}) to add you to his/her contacts list?`;

      dispatch('SHOW_ALERT', {
        alertId: friendCandidate.userId,
        message,
        report: false,
        postponeLabel: 'Decide later',
        nackLabel: 'Ignore',
        ackLabel: 'Allow',
        resultCallback: result => {
          if (result === 'ack' || result === 'nack') {
            socket.send({
              id: 'FRIEND_VERDICT',
              userId,
              allow: result === 'ack'
            });
          }
        }
      });
    }
  }

  handleRemoveFriend(data) {
    socket.send({
      id: 'REMOVE_FRIEND',
      userId: data.userId
    });
  }
}

export default new FriendStore();
