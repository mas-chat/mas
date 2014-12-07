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

export default Ember.ObjectController.extend({
    modalSoundAlert: null,
    modalTitleAlert: null,

    actions: {
        changeAlerts: function() {
            // User has clicked 'OK', send the new settings to server
            var newSoundAlert = this.get('modalSoundAlert');
            var newTitleAlert = this.get('modalTitleAlert');

            this.remote.send({
                id: 'UPDATE',
                windowId: this.get('windowId'),
                sounds: newSoundAlert === 'enabled',
                titleAlert: newTitleAlert === 'enabled'
            });

            this.send('closeModal');
        },

        cancel: function() {
            this._updateModalAlerts();
            this.send('closeModal');
        }
    },

    alertsDidChange: function() {
        this._updateModalAlerts();
    }.observes('sounds', 'titleAlert').on('init'),

    alertsTitle: function() {
        return 'Configure alerts for \'' + this.get('name') + '\'';
    }.property('name'),

    _updateModalAlerts: function() {
        this.set('modalSoundAlert', this.get('sounds') ? 'enabled' : 'disabled');
        this.set('modalTitleAlert', this.get('titleAlert') ? 'enabled' : 'disabled');
    }
});
