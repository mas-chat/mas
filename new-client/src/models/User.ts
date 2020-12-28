import { observable, makeObservable } from 'mobx';

export default class UserModel {
  store;
  gravatar = null;
  nick = {};

  constructor(store, props) {
    makeObservable(this, {
      gravatar: observable,
      nick: observable
    });

    this.store = store;
    Object.assign(this, props);
  }
}
