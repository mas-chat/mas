import Mobx from 'mobx';

const { observable } = Mobx;

export default class UserModel {
  store;
  @observable gravatar = null;
  @observable nick = {};

  constructor(store, props) {
    this.store = store;
    Object.assign(this, props);
  }
}
