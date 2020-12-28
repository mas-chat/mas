import { observable } from 'mobx';
import isMobile from 'ismobilejs';
import SettingsModel from '../models/Settings';
import { dispatch } from '../utils/dispatcher';
import socket from '../utils/socket';
import windowStore from './WindowStore';
import { mandatory } from '../utils/parameters';

class SettingStore {
  @observable settings = new SettingsModel(this, {});

  handleToggleTheme() {
    const newTheme = this.settings.theme === 'dark' ? 'default' : 'dark';
    this.settings.theme = newTheme;

    socket.send({
      id: 'SET',
      settings: {
        theme: newTheme
      }
    });
  }

  handleConfirmEmail() {
    const msg = "Confirmation link sent. Check your spam folder if you don't see it in inbox.";

    socket.send(
      {
        id: 'SEND_CONFIRM_EMAIL'
      },
      () => {
        dispatch('SHOW_ALERT', {
          alertId: `client-${Date.now()}`,
          message: msg,
          postponeLabel: false,
          ackLabel: 'Okay',
          resultCallback: () => {
            this.settings.emailConfirmed = true;
          }
        });
      }
    );
  }

  handleSetEmailConfirmed() {
    this.settings.emailConfirmed = true;
  }

  handleChangeActiveDesktop({ desktopId = mandatory() }) {
    if (!windowStore.initDone) {
      return;
    }

    this.settings.activeDesktop = desktopId;

    if (!isMobile().any) {
      socket.send({
        id: 'SET',
        settings: {
          activeDesktop: desktopId
        }
      });
    }
  }

  handleUpdateSettingsServer({ settings = mandatory() }) {
    Object.assign(this.settings, settings);
  }
}

export default new SettingStore();
