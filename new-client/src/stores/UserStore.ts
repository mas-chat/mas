import { observable, makeObservable } from 'mobx';
import Cookies from 'js-cookie';
import UserModel from '../models/User';

class UserStore {
  users = new Map();

  userId = null;

  constructor() {
    makeObservable(this, {
      users: observable
    });

    try {
      // TODO: Should read this from initok request but that's too late
      const cookie = JSON.parse(window.atob(Cookies.get('mas')));
      this.userId = `m${cookie.userId}`;
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Failed to read the cookie.');
    }
  }

  handleAddUsersServer({ mapping }) {
    Object.entries(mapping).forEach(([userId, user]) => {
      this.users.set(userId, new UserModel(this, user));
    });
  }
}

export default new UserStore();
