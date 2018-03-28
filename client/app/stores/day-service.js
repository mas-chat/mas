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

import { later } from '@ember/runloop';
import moment from 'npm:moment';
import Store from './base';

const DayServiceStore = Store.extend({
  dayCounter: 0,

  init() {
    this._super();

    this._startDayChangedService();
  },

  _startDayChangedService() {
    // Day has changed service
    const timeToTomorrow =
      moment()
        .endOf('day')
        .diff(moment()) + 1;

    const changeDay = function() {
      this.incrementProperty('dayCounter');
      later(this, changeDay, 1000 * 60 * 60 * 24);
    };

    later(this, changeDay, timeToTomorrow);
  }
});

window.stores = window.stores || {};
window.stores['day-service'] = DayServiceStore.create();
