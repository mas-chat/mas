import { computed, observable, makeObservable } from 'mobx';
import userStore from '../stores/UserStore';

export default class FriendModel {
  store;
  userId;
  last;
  online;

  get name() {
    return userStore.users.get(this.userId).name;
  }

  constructor(store, props) {
    makeObservable(this, {
      last: observable,
      online: observable,
      name: computed
    });

    this.store = store;
    this.userId = props.userId;
    this.last = props.last || null;
    this.online = props.online;
  }
}
