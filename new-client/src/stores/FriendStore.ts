import { observable, makeObservable } from 'mobx';
import { dispatch } from '../lib/dispatcher';
import userStore from './UserStore';
import FriendModel from '../models/Friend';
import socket from '../lib/socket';

class FriendStore {
  friends = new Map();

  constructor() {
    makeObservable(this, {
      friends: observable
    });
  }

  handleAddFriendsServer({ reset, friends }) {
    if (reset) {
      this.friends.clear();
    }

    friends.forEach(friend => {
      this.friends.set(friend.userId, new FriendModel(this, friend));
    });
  }

  handleConfirmRemoveFriend({ userId }) {
    dispatch('OPEN_MODAL', {
      name: 'remove-friend-modal',
      model: userId
    });
  }

  handleRequestFriend({ userId }) {
    socket.send(
      {
        id: 'REQUEST_FRIEND',
        userId
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

  handleConfirmFriendsServer({ friends }) {
    for (const friendCandidate of friends) {
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

  handleRemoveFriend({ userId }) {
    socket.send({
      id: 'REMOVE_FRIEND',
      userId
    });
  }
}

export default new FriendStore();
