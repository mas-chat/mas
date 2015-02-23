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

export default Ember.Controller.extend({
    initDone: false,
    currentAlert: null,
    alerts: null,

    socket: Ember.inject.service(),

    actions: {
        ackAlert() {
            this.get('socket').send({
                id: 'ACKALERT',
                alertId: this.get('currentAlert.alertId')
            });

            this.set('currentAlert', null);
            this._setCurrentAlert();
        },

        hideAlert() {
            this.set('currentAlert', null);
            this._setCurrentAlert();
        }
    },

    observeAlerts: function() {
        this._setCurrentAlert();
    }.observes('alerts.@each'),

    _setCurrentAlert() {
        let alerts = this.get('alerts');

        if (this.get('currentAlert') === null && alerts.length > 0) {
            this.set('currentAlert', alerts.shift());
        }

        Ember.run.next(this, function() {
            // A trick to trigger window relayout, see resize handler in views/grid.js
            $(window).trigger('resize');
        });
    }
});
