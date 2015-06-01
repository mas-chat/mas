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
    modalPassword: null,
    modalPasswordEnabled: false,
    errorMsg: '',

    socket: Ember.inject.service(),

    modalPasswordDisabled: Ember.computed('modalPasswordEnabled', function() {
        return !this.get('modalPasswordEnabled');
    }),

    passwordTitle: Ember.computed('model.name', function() {
        return 'Change Password for \'' + this.get('model.name') + '\'';
    }),

    didInitAttrs() {
        this._updateModalPassword();
    },

    passwordDidChange: function() {
        this._updateModalPassword();
    }.observes('model.password'),

    actions: {
        changePassword() {
            // User has clicked 'OK', send the new password to server
            let newPassword = '';

            if (this.get('modalPasswordEnabled')) {
                newPassword = this.get('modalPassword');
            }

            this.get('socket').send({
                id: 'UPDATE_PASSWORD',
                windowId: this.get('model.windowId'),
                password: newPassword
            }, function(resp) {
                if (resp.status === 'OK') {
                    this.sendAction('closeModal');
                } else {
                    this.set('errorMsg', resp.errorMsg);
                }
            }.bind(this));
        },

        closeModal() {
            this.sendAction('closeModal');
        }
    },

    _updateModalPassword() {
        let password = this.get('model.password');

        this.set('modalPassword', password);
        this.set('modalPasswordEnabled', password !== '');
    }
});
