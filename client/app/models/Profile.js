import Mobx from 'mobx';

const { observable } = Mobx;

export default class ProfileModel {
  @observable nick = '';
  @observable name = '';
  @observable email = '';

  constructor(store, props) {
    Object.assign(this, props);
  }
}
