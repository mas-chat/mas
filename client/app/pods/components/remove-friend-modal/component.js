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

import Ember from 'ember';
import { dispatch } from '../../../utils/dispatcher';

export default Ember.Component.extend({
    stores: Ember.inject.service(),

    userId: Ember.computed.alias('model'),

    name: Ember.computed('userId', function() {
        return this.get('stores.users.users').getByIndex(this.get('userId')).get('name');
    }),

    nick: Ember.computed('userId', function() {
        return this.get('stores.users.users').getByIndex(this.get('userId')).get('nick')['MAS'];
    }),

    actions: {
        remove() {
            dispatch('REMOVE_FRIEND', {
                userId: this.get('userId')
            });

            this.sendAction('closeModal');
        },

        closeModal() {
            this.sendAction('closeModal');
        }
    }
});
