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

import { autorun } from 'mobx';
import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import { dispatch } from '../../../utils/dispatcher';
import userStore from '../../../stores/UserStore';

export default Component.extend({
  userId: alias('model'),

  init(...args) {
    this._super(...args);

    autorun(() => {
      this.set('name', userStore.users.get(userStore.userId).name);
      this.set('nick', userStore.users.get(userStore.userId).nick.mas);
    });
  },

  actions: {
    remove() {
      dispatch('REMOVE_FRIEND', {
        userId: this.userId
      });

      this.sendAction('closeModal');
    },

    closeModal() {
      this.sendAction('closeModal');
    }
  }
});
