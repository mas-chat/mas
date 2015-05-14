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
    channel: '',
    password: '',
    errorMsg: '',

    socket: Ember.inject.service(),
    store: Ember.inject.service(),

    selectedNetwork: null,

    ircNetworks: Ember.computed('store.networks', function() {
        return this.get('store.networks').removeObject('MAS');
    }),

    actions: {
        joinIRC() {
            this.get('socket').send({
                id: 'JOIN',
                network: this.get('selectedNetwork'),
                name: this.get('channel'),
                password: this.get('password').trim()
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
    }
});
