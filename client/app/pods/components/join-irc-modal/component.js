//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
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
import networkStore from '../../../stores/NetworkStore';
import { dispatch } from '../../../utils/dispatcher';

const { autorun } = Mobx;

export default Component.extend({
  init(...args) {
    this._super(...args);

    this.disposer = autorun(() => {
      this.set('ircNetworks', networkStore.networks.filter(network => network !== 'MAS'));
    });
  },

  didDestroyElement() {
    this.disposer();
  },

  channel: '',
  password: '',
  errorMsg: '',

  selectedNetwork: null,

  actions: {
    joinIRC() {
      const password = this.password.trim();

      dispatch(
        'JOIN_IRC_CHANNEL',
        {
          name: this.channel,
          network: this.selectedNetwork,
          password
        },
        () => {
          // Accept
          this.sendAction('closeModal');
          this.set('selectedNetwork', null);
        },
        reason => this.set('errorMsg', reason)
      ); // Reject
    },

    changeNetwork() {
      this.set('selectedNetwork', this.$('select').val());
    },

    closeModal() {
      this.sendAction('closeModal');
    }
  }
});
