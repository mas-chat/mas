import { observable, makeObservable } from 'mobx';
import { Theme } from '../types/notifications';

type SettingModelProps = {
  theme?: Theme;
  activeWindowId?: number;
  emailConfirmed?: boolean;
  canUseIRC?: boolean;
};

export default class SettingModel {
  public theme: Theme;
  public activeWindowId: number;
  public emailConfirmed: boolean;
  public canUseIRC: boolean;

  constructor({ theme, activeWindowId, emailConfirmed, canUseIRC }: SettingModelProps = {}) {
    this.theme = theme || Theme.DefaultV2;
    this.activeWindowId = activeWindowId || 0;
    this.emailConfirmed = emailConfirmed || true;
    this.canUseIRC = canUseIRC || false;

    makeObservable(this, {
      theme: observable,
      activeWindowId: observable,
      emailConfirmed: observable,
      canUseIRC: observable
    });
  }
}
