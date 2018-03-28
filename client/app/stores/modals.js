//
//   Copyright 2009-2015 Ilkka Oksanen <iao@iki.fi>
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

import { A } from '@ember/array';
import Store from './base';

const ModalsStore = Store.extend({
  modals: A([]),

  handleOpenModal(data) {
    this.get('modals').pushObject({
      name: data.name,
      model: data.model
    });
  },

  handleCloseModal() {
    this.get('modals').shiftObject();
  },

  handleOpenPriorityModal(data) {
    this.get('modals').unshiftObject({
      // Show immediately
      name: data.name,
      model: data.model
    });
  },

  handleClosePriorityModal() {
    this.get('modals').shiftObject();
  }
});

window.stores = window.stores || {};
window.stores.modals = ModalsStore.create();
