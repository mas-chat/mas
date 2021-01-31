import { action, observable, makeObservable } from 'mobx';
import isMobile from 'ismobilejs';
import SettingsModel from '../models/Settings';
import { Notification, Theme } from '../types/notifications';
import { SendConfirmEmailRequest } from '../types/requests';
import RootStore from './RootStore';
import Socket from '../lib/socket';

class SettingStore {
  rootStore: RootStore;
  socket: Socket;
  settings = new SettingsModel();

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      settings: observable,
      updateSettings: action
    });
  }

  handlerServerNotification(ntf: Notification): boolean {
    switch (ntf.type) {
      case 'UPDATE_SETTINGS':
        const { theme, activeDesktop, emailConfirmed, canUseIRC } = ntf.settings;
        this.updateSettings(theme, activeDesktop, emailConfirmed, canUseIRC);
        break;
      default:
        return false;
    }

    return true;
  }

  updateSettings(
    theme?: Theme | undefined,
    activeDesktop?: number | undefined,
    emailConfirmed?: boolean | undefined,
    canUseIRC?: boolean | undefined
  ): void {
    this.settings.theme = theme === undefined ? this.settings.theme : theme;
    this.settings.activeDesktop = activeDesktop === undefined ? this.settings.activeDesktop : activeDesktop;
    this.settings.emailConfirmed = emailConfirmed === undefined ? this.settings.emailConfirmed : emailConfirmed;
    this.settings.canUseIRC = canUseIRC === undefined ? this.settings.canUseIRC : canUseIRC;
  }

  toggleTheme(): void {
    const newTheme = this.settings.theme === Theme.Dark ? Theme.Default : Theme.Default;
    this.updateSettings(newTheme);

    this.socket.send({
      id: 'SET',
      settings: {
        theme: newTheme
      }
    });
  }

  async handleConfirmEmail(): Promise<void> {
    const msg = "Confirmation link sent. Check your spam folder if you don't see it in inbox.";

    await this.socket.send<SendConfirmEmailRequest>({ id: 'SEND_CONFIRM_EMAIL' });

    this.rootStore.alertStore.showAlert(null, msg, 'Okay', false, false, () => {
      this.setEmailConfirmed();
    });
  }

  setEmailConfirmed(): void {
    this.updateSettings(undefined, undefined, true);
  }

  changeActiveDesktop(activeDesktop: number): void {
    if (!this.rootStore.windowStore.initDone) {
      return;
    }

    this.updateSettings(undefined, activeDesktop);

    if (!isMobile().any) {
      this.socket.send({ id: 'SET', settings: { activeDesktop } });
    }
  }
}

export default SettingStore;
