import Mobx from 'mobx';
import userStore from '../stores/UserStore';

const { computed, observable } = Mobx;

export default class FriendModel {
  store;
  userId;
  @observable last;
  @observable online;

  @computed
  get name() {
    return userStore.users.get(this.userId).name;
  }

  constructor(store, props) {
    this.store = store;
    this.userId = props.userId;
    this.last = props.last || null;
    this.online = props.online;
  }
}
