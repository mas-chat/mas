import { observable, makeObservable } from 'mobx';
import { Theme } from '../types/notifications';

type SettingModelProps = {
  theme?: Theme;
  activeDesktop?: number;
  emailConfirmed?: boolean;
  canUseIRC?: boolean;
};

export default class SettingModel {
  public theme: Theme;
  public activeDesktop: number;
  public emailConfirmed: boolean;
  public canUseIRC: boolean;

  constructor({ theme, activeDesktop, emailConfirmed, canUseIRC }: SettingModelProps = {}) {
    this.theme = theme || Theme.Default;
    this.activeDesktop = activeDesktop || 0;
    this.emailConfirmed = emailConfirmed || true;
    this.canUseIRC = canUseIRC || false;

    makeObservable(this, {
      theme: observable,
      activeDesktop: observable,
      emailConfirmed: observable,
      canUseIRC: observable
    });
  }
}
