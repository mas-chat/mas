import { observable, makeObservable } from 'mobx';

export default class SettingModel {
  theme = 'default';
  activeDesktop = 0;
  email = ''; // TODO: Remove from here, keep in profile
  emailConfirmed = true;
  canUseIRC = false;

  constructor(store, props) {
    makeObservable(this, {
      theme: observable,
      activeDesktop: observable,
      email: observable,
      emailConfirmed: observable,
      canUseIRC: observable
    });

    Object.assign(this, props);
  }
}
