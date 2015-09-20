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

'use strict';

import Ember from 'ember';

export default Ember.Component.extend({
    socket: Ember.inject.service(),

    model: null,
    alerts: Ember.computed.oneWay('model.alerts'), // TBD: Use one way bindings in other modals too

    actions: {
        changeAlerts() {
            if (this.get('alerts.notification') && 'Notification' in window &&
                Notification.permission !== 'granted') {
                Notification.requestPermission();
            }

            this.set('model.alerts', this.get('alerts'));
            this.sendAction('closeModal');

            this.get('socket').send({
                id: 'UPDATE',
                windowId: this.get('model.windowId'),
                alerts: this.get('alerts')
            });
        },

        closeModal() {
            this.sendAction('closeModal');
        }
    },

    alertsTitle: Ember.computed('model.name', function() {
        return 'Configure alerts for \'' + this.get('model.simplifiedName') + '\'';
    })
});
