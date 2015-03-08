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
    group: '',
    password: '',
    errorMsg: '',

    socket: Ember.inject.service(),

    actions: {
        joinGroup() {
            let password = this.get('password').trim();

            if (password === '') {
                password = null;
            }

            this.get('socket').send({
                id: 'JOIN',
                network: 'MAS',
                name: this.get('group'),
                password: password
            }, function(resp) {
                if (resp.status === 'OK') {
                    this.send('closeModal');
                } else {
                    this.set('errorMsg', resp.errorMsg);
                }
            }.bind(this));
        },

        closeModal() {
            this.sendAction();
        }
    }
});
