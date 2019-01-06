import Mobx from 'mobx';
import ProfileModel from '../models/Profile';
import { dispatch } from '../utils/dispatcher';
import socket from '../utils/socket';
import { mandatory } from '../utils/parameters';

const { observable } = Mobx;

class ProfileStore {
  @observable profile = new ProfileModel(this, {});

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
