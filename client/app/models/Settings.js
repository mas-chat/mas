import Mobx from 'mobx';
import WindowStore from '../stores/WindowStore';

const { computed, observable } = Mobx;

export default class SettingModel {
  @observable theme = 'default';
  @observable actualActiveDesktop = 1;
  @observable email = ''; // TODO: Remove from here, keep in profile
  @observable emailConfirmed = true;
  @observable canUseIRC = false;

  @computed
  get activeDesktop() {
    return this.actualActiveDesktop;
  }

  set activeDesktop(value) {
    const valid = Array.from(WindowStore.windows.values()).some(window => window.desktop === value);

    if (valid) {
      this.actualActiveDesktop = value;
    } else if (WindowStore.windows.size > 0) {
      this.actualActiveDesktop = WindowStore.windows.values().next().value.desktop;
    } else {
      this.actualActiveDesktop = 0;
    }
  }

  constructor(store, props) {
    Object.assign(this, props);
  }
}
