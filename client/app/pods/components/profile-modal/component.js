//
//   Copyright 2015 Ilkka Oksanen <iao@iki.fi>
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
    errorMsg: '',

    socket: Ember.inject.service(),

    actions: {
        edit() {
            this.get('socket').send({
                id: 'UPDATE_PROFILE',
                name: this.get('name'),
                email: this.get('email')
            }, function(resp) {
                if (resp.status === 'OK') {
                    this.sendAction('closeModal');
                } else {
                    this.set('errorMsg', resp.errorMsg);
                }
            }.bind(this));
        },

        terminate() {
            this.sendAction('openModal', 'confirm-delete-account-modal');
            this.sendAction('closeModal');
        },

        closeModal() {
            this.sendAction('closeModal');
        }
    },

    didInsertElement() {
        this.get('socket').send({
            id: 'GET_PROFILE'
        }, function(resp) {
            this.set('name', resp.name);
            this.set('email', resp.email);
            this.set('nick', resp.nick);
        }.bind(this));
    }
});
