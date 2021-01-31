import { observable, makeObservable, action } from 'mobx';
import ProfileModel from '../models/Profile';
import { UpdateProfileRequest, GetProfileRequest } from '../types/requests';
import RootStore from './RootStore';
import Socket from '../lib/socket';

class ProfileStore {
  rootStore: RootStore;
  socket: Socket;
  profile: ProfileModel = new ProfileModel({
    name: '',
    email: ''
  });

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      profile: observable,
      updateProfile: action,
      fetchProfile: action
    });
  }

  handlerServerNotification(): boolean {
    return false;
  }

  async updateProfile(name: string, email: string): Promise<void> {
    const response = await this.socket.send<UpdateProfileRequest>({ id: 'UPDATE_PROFILE', name, email });

    if (response.status === 'OK') {
      // Don't nag about unconfirmed email address anymore in this session
      this.rootStore.settingStore.setEmailConfirmed();

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
}

export default ProfileStore;
