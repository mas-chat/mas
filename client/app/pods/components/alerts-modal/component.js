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

import { computed } from '@ember/object';
import { oneWay } from '@ember/object/computed';
import Component from '@ember/component';
import { dispatch } from '../../../utils/dispatcher';

export default Component.extend({
  model: null,
  alerts: oneWay('model.alerts'),

  actions: {
    changeAlerts() {
      if (this.get('alerts.notification') && 'Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
      }

      dispatch('UPDATE_WINDOW_ALERTS', {
        window: this.model,
        alerts: this.alerts
      });

      this.sendAction('closeModal');
    },

    closeModal() {
      this.sendAction('closeModal');
    }
  },

  alertsTitle: computed('model.name', function () {
    return `Configure alerts for '${this.get('model.simplifiedName')}'`;
  })
});
