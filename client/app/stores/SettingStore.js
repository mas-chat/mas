import Mobx from 'npm:mobx';
import isMobile from 'npm:ismobilejs';
import SettingsModel from '../models/Settings';
import { dispatch } from '../utils/dispatcher';
import socket from '../utils/socket';

const { observable } = Mobx;

class SettingsStore {
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
          resultCallback: () => this.set('emailConfirmed', true)
        });
      }
    );
  }

  handleSetEmailConfirmed() {
    this.settings.emailConfirmed = true;
  }

  handleChangeActiveDesktop(data) {
    this.settings.activeDesktop = data.desktop;

    if (!isMobile.any) {
      socket.send({
        id: 'SET',
        settings: {
          activeDesktop: data.desktop
        }
      });
    }
  }

  handleUpdateSettingsServer(data) {
    if (isMobile.any) {
      delete data.settings.activeDesktop;
    }

    this.settings = new SettingsModel(this, data.settings);
  }
}

export default new SettingsStore();
