import { observable, makeObservable } from 'mobx';

export default class SettingModel {
  constructor(
    public theme: 'default' | 'dark' = 'default',
    public activeDesktop: number = 0,
    public emailConfirmed: boolean = true,
    public canUseIRC: boolean = false
  ) {
    makeObservable(this, {
      theme: observable,
      activeDesktop: observable,
      emailConfirmed: observable,
      canUseIRC: observable
    });
  }
}
