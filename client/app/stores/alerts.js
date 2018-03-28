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

import Store from './base';
import IndexArray from '../utils/index-array';
import Alert from '../models/alert';
import socket from '../utils/socket';

const AlertsStore = Store.extend({
  alerts: IndexArray.create({ index: 'alertId', factory: Alert }),

  handleShowAlert(data) {
    this.get('alerts').upsertModel(data);
  },

  handleShowAlertServer(data) {
    // Default labels for alerts
    data.postponeLabel = 'Show again later';
    data.ackLabel = 'Dismiss';

    data.resultCallback = result => {
      if (result === 'ack') {
        socket.send({
          id: 'ACKALERT',
          alertId: data.alertId
        });
      }
    };

    this.get('alerts').upsertModel(data);
  },

  handleCloseAlert(data) {
    const callback = this.get('alerts')
      .get('firstObject')
      .get('resultCallback');

    if (callback) {
      callback(data.result);
    }

    this.get('alerts').shiftObject();
  }
});

window.stores = window.stores || {};
window.stores.alerts = AlertsStore.create();
