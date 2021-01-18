import { observable, makeObservable } from 'mobx';
import isMobile from 'ismobilejs';
import SettingsModel from '../models/Settings';
import { Notification } from '../types/notifications';
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
      settings: observable
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
    theme?: 'default' | 'dark' | undefined,
    activeDesktop?: number | undefined,
    emailConfirmed?: boolean | undefined,
    canUseIRC?: boolean | undefined
  ) {
    this.settings = new SettingsModel(
      theme === undefined ? this.settings.theme : theme,
      activeDesktop === undefined ? this.settings.activeDesktop : activeDesktop,
      emailConfirmed === undefined ? this.settings.emailConfirmed : emailConfirmed,
      canUseIRC === undefined ? this.settings.canUseIRC : canUseIRC
    );
  }

  toggleTheme() {
    const newTheme = this.settings.theme === 'dark' ? 'default' : 'dark';
    this.updateSettings(newTheme);

    this.socket.send({
      id: 'SET',
      settings: {
        theme: newTheme
      }
    });
  }

  async handleConfirmEmail() {
    const msg = "Confirmation link sent. Check your spam folder if you don't see it in inbox.";

    await this.socket.send<SendConfirmEmailRequest>({ id: 'SEND_CONFIRM_EMAIL' });

    this.rootStore.alertStore.showAlert(null, msg, 'Okay', false, false, () => {
      this.setEmailConfirmed();
    });
  }

  setEmailConfirmed() {
    this.updateSettings(undefined, undefined, true);
  }

  changeActiveDesktop(activeDesktop: number) {
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
