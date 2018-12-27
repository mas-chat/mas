import Mobx from 'mobx';
import Cookies from 'js-cookie';
import UserModel from '../models/User';

const { observable } = Mobx;

class UserStore {
  @observable users = new Map();
  userId = null;

  constructor() {
    try {
      // TODO: Should read this from initok request but that's too late
      this.userId = `m${JSON.parse(window.atob(Cookies.get('mas'))).userId}`;
    } catch {}
  }

  handleAddUsersServer(data) {
    Object.keys(data.mapping).forEach(userId => {
      const user = data.mapping[userId];
      this.users.set(userId, new UserModel(this, user));
    });
  }
}

export default new UserStore();
