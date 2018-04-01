import Mobx from 'npm:mobx';
import ProfileModel from '../models/Profile';
import { dispatch } from '../utils/dispatcher';
import socket from '../utils/socket';

const { observable } = Mobx;

class ProfileStore {
  @observable profile = new ProfileModel(this, {});

  handleUpdateProfile(data, successCb, rejectCb) {
    socket.send(
      {
        id: 'UPDATE_PROFILE',
        name: data.name,
        email: data.email
      },
      resp => {
        if (resp.status === 'OK') {
          // Don't nag about unconfirmed email address anymore in this session
          dispatch('SET_EMAIL_CONFIRMED');
          successCb();
        } else {
          rejectCb(resp.errorMsg);
        }
      }
    );
  }

  handleFetchProfile() {
    socket.send(
      {
        id: 'GET_PROFILE'
      },
      resp => {
        this.profile = new ProfileModel(this, resp);
      }
    );
  }
}

export default new ProfileStore();
