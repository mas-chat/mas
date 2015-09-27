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

import Ember from 'ember';

export default Ember.Component.extend({
    action: Ember.inject.service(),
    store: Ember.inject.service(),

    classNames: [ 'flex-row', 'announcement' ],

    alerts: Ember.computed.oneWay('store.alerts'),

    currentAlert: Ember.computed('alerts.[]', function() {
        let alerts = this.get('alerts');

        return alerts.length === 0 ? null : alerts.get('firstObject');
    }),

    actions: {
        close(result) {
            this.get('action').dispatch('CLOSE_ALERT', { result: result });
        }
    }
});
