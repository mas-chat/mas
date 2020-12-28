import { observable, makeObservable } from 'mobx';
import ProfileModel from '../models/Profile';
import { dispatch } from '../utils/dispatcher';
import socket from '../utils/socket';
import { mandatory } from '../utils/parameters';

class ProfileStore {
  profile = new ProfileModel(this, {});

  constructor() {
    makeObservable(this, {
      profile: observable
    });
  }

  handleUpdateProfile({ name = mandatory(), email = mandatory(), successCb = mandatory(), rejectCb = mandatory() }) {
    socket.send(
      {
        id: 'UPDATE_PROFILE',
        name,
        email
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
