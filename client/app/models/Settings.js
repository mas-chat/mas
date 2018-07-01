import Mobx from 'mobx';

const { observable } = Mobx;

export default class AlertModel {
  @observable theme = 'default';
  @observable activeDesktop = 1;
  @observable email = ''; // TODO: Remove from here, keep in profile
  @observable emailConfirmed = true;
  @observable canUseIRC = false;

  constructor(store, props) {
    Object.assign(this, props);
  }
}
