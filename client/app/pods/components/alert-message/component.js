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

import Mobx from 'npm:mobx';
import Component from '@ember/component';
import { dispatch } from '../../../utils/dispatcher';
import alertStore from '../../../stores/AlertStore';

const { autorun } = Mobx;

export default Component.extend({
  init(...args) {
    this._super(...args);

    this.disposer = autorun(() => {
      this.set('currentAlert', alertStore.currentAlert);
    });
  },

  didDestroyElement() {
    this.disposer();
  },

  classNames: ['flex-row', 'announcement'],

  actions: {
    close(result) {
      dispatch('CLOSE_ALERT', { alert: this.get('currentAlert'), result });
    }
  }
});
