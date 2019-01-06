//
//   Copyright 2015 Ilkka Oksanen <iao@iki.fi>
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing,
//   software distributed under the License is distributed on an "AS
//   IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
//   express or implied.  See the License for the specific language
//   governing permissions and limitations under the License.
//

import Mobx from 'mobx';
import Component from '@ember/component';
import profileStore from '../../../stores/ProfileStore';
import { dispatch } from '../../../utils/dispatcher';

const { autorun } = Mobx;

export default Component.extend({
  init(...args) {
    this._super(...args);

    this.disposer = autorun(() => {
      this.set('name', profileStore.profile.name);
      this.set('email', profileStore.profile.email);
      this.set('nick', profileStore.profile.nick);
    });
  },

  didDestroyElement() {
    this.disposer();
  },

  errorMsg: '',

  actions: {
    edit() {
      dispatch('UPDATE_PROFILE', {
        name: this.name,
        email: this.email,
        successCb: () => this.sendAction('closeModal'),
        rejectCb: reason => this.set('errorMsg', reason)
      });
    },

    terminate() {
      dispatch('OPEN_MODAL', {
        name: 'confirm-delete-account-modal'
      });
      this.sendAction('closeModal');
    },

    closeModal() {
      this.sendAction('closeModal');
    }
  },

  didInsertElement() {
    dispatch('FETCH_PROFILE');
  }
});
