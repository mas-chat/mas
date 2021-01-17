import { observable, makeObservable, action } from 'mobx';
import ProfileModel from '../models/Profile';
import socket from '../lib/socket';
import settingStore from '../stores/SettingStore';
import { UpdateProfileRequest, GetProfileRequest } from '../types/requests';

class ProfileStore {
  profile: ProfileModel = new ProfileModel();

  constructor() {
    makeObservable(this, {
      profile: observable,
      updateProfile: action,
      fetchProfile: action
    });
  }

  handlerServerNotification() {
    return false;
  }

  async updateProfile(name: string, email: string, successCb: () => void, rejectCb: (errorMsg?: string) => void) {
    const response = await socket.send<UpdateProfileRequest>({ id: 'UPDATE_PROFILE', name, email });

    if (response.status === 'OK') {
      // Don't nag about unconfirmed email address anymore in this session
      settingStore.setEmailConfirmed();

      this.profile = new ProfileModel(this.profile.nick, name, email);
      successCb();
    } else {
      rejectCb(response.errorMsg);
    }
  }

  async fetchProfile() {
    const response = await socket.send<GetProfileRequest>({ id: 'GET_PROFILE' });

    this.profile = new ProfileModel(response.nick, response.name, response.email);
  }
}

export default new ProfileStore();
