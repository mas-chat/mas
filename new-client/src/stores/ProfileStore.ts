import { observable, makeObservable, action } from 'mobx';
import ProfileModel from '../models/Profile';
import SettingsModel from '../models/Settings';
import { Notification, Theme } from '../types/notifications';
import { UpdateProfileRequest, GetProfileRequest, SendConfirmEmailRequest } from '../types/requests';
import RootStore from './RootStore';
import Socket from '../lib/socket';

class ProfileStore {
  rootStore: RootStore;
  socket: Socket;
  profile: ProfileModel = new ProfileModel({
    name: '',
    email: ''
  });
  settings = new SettingsModel();

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      profile: observable,
      settings: observable,
      updateProfile: action,
      fetchProfile: action,
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

  async updateProfile(name: string, email: string): Promise<void> {
    const response = await this.socket.send<UpdateProfileRequest>({ id: 'UPDATE_PROFILE', name, email });

    if (response.status === 'OK') {
      // Don't nag about unconfirmed email address anymore in this session
      this.setEmailConfirmed();

      this.profile.name = name;
      this.profile.email = email;
    } else {
      this.rootStore.modalStore.openModal('info-modal', { title: 'Error', body: response.errorMsg });
    }
  }

  async fetchProfile(): Promise<void> {
    const response = await this.socket.send<GetProfileRequest>({ id: 'GET_PROFILE' });

    this.profile.name = response.name;
    this.profile.email = response.email;
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
    this.socket.send({ id: 'SET', settings: { activeDesktop } });
  }
}

export default ProfileStore;
