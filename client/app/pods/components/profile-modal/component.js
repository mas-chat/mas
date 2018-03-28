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

import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import { dispatch } from '../../../utils/dispatcher';

export default Component.extend({
  stores: service(),

  name: alias('stores.profile.name'),
  email: alias('stores.profile.email'),
  nick: alias('stores.profile.nick'),

  errorMsg: '',

  actions: {
    edit() {
      dispatch(
        'UPDATE_PROFILE',
        {
          name: this.get('name'),
          email: this.get('email')
        },
        () => this.sendAction('closeModal'), // Accept
        reason => this.set('errorMsg', reason)
      ); // Reject
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
