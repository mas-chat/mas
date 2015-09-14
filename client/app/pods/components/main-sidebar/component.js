//
//   Copyright 2009-2015 Ilkka Oksanen <iao@iki.fi>
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
    store: Ember.inject.service(),

    classNames: [ 'sidebar', 'flex-grow-column' ],

    activeDraggedWindow: Ember.computed.alias('store.activeDraggedWindow'),
    friends: Ember.computed.alias('store.friends'),

    actions: {
        openModal(modal) {
            this.sendAction('openModal', modal);
        },

        removeFriend(userId) {
            this.sendAction('openModal', 'remove-friend-modal', userId);
        },

        windowAction(command, window, value) {
            this.sendAction('windowAction', command, window, value);
        },

        logout() {
            this.get('socket').send({ id: 'LOGOUT' }, function() {
                $.removeCookie('auth', { path: '/' });

                if (typeof Storage !== 'undefined') {
                    window.localStorage.removeItem('data');
                }

                window.location = '/';
            });
        }
    },

    friendsOnline: Ember.computed('friends.@each.online', function() {
        return this.get('friends').filterBy('online', true).length;
    })
});
