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
    model: null,
    modalSoundAlert: false,
    modalTitleAlert: false,
    modalEmailAlert: false,

    // TBD: Simplify when one-way bindings are available

    actions: {
        changeAlerts() {
            this.set('model.soundAlert', this.get('modalSoundAlert'));
            this.set('model.titleAlert', this.get('modalTitleAlert'));
            this.set('model.emailAlert', this.get('modalEmailAlert'));

            this.sendAction('closeModal');
        },

        closeModal() {
            this.sendAction('closeModal');
        }
    },

    didInitAttrs() {
        this.set('modalSoundAlert', this.get('model.soundAlert'));
        this.set('modalTitleAlert', this.get('model.titleAlert'));
        this.set('modalEmailAlert', this.get('model.emailAlert'));
    },

    soundAlertDidChange: Ember.observer('model.soundAlert', function() {
        this.set('modalSoundAlert', this.get('model.soundAlert'));
    }),

    titleAlertDidChange: Ember.observer('model.titleAlert', function() {
        this.set('modalTitleAlert', this.get('model.titleAlert'));
    }),

    emailAlertDidChange: Ember.observer('model.emailAlert', function() {
        this.set('modalEmailAlert', this.get('model.emailAlert'));
    }),

    alertsTitle: Ember.computed('model.name', function() {
        return 'Configure alerts for \'' + this.get('model.simplifiedName') + '\'';
    })
});
