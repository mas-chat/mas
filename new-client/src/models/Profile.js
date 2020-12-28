import { observable, makeObservable } from 'mobx';

export default class ProfileModel {
  nick = '';
  name = '';
  email = '';

  constructor(store, props) {
    makeObservable(this, {
      nick: observable,
      name: observable,
      email: observable
    });

    Object.assign(this, props);
  }
}
