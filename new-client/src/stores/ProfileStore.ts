import { observable, makeObservable, action } from 'mobx';
import ProfileModel from '../models/Profile';
import { UpdateProfileRequest, GetProfileRequest } from '../types/requests';
import RootStore from './RootStore';
import Socket from '../lib/socket';

class ProfileStore {
  rootStore: RootStore;
  socket: Socket;
  profile: ProfileModel = new ProfileModel();

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

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
    const response = await this.socket.send<UpdateProfileRequest>({ id: 'UPDATE_PROFILE', name, email });

    if (response.status === 'OK') {
      // Don't nag about unconfirmed email address anymore in this session
      this.rootStore.settingStore.setEmailConfirmed();

      this.profile = new ProfileModel(this.profile.nick, name, email);
      successCb();
    } else {
      rejectCb(response.errorMsg);
    }
  }

  async fetchProfile() {
    const response = await this.socket.send<GetProfileRequest>({ id: 'GET_PROFILE' });

    this.profile = new ProfileModel(response.nick, response.name, response.email);
  }
}

export default ProfileStore;
