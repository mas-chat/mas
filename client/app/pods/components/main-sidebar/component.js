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

import Ember from 'ember';
import KeyboardShortcuts from 'ember-keyboard-shortcuts/mixins/component';

export default Ember.Component.extend(KeyboardShortcuts, {
    action: Ember.inject.service(),
    store: Ember.inject.service(),

    classNames: [ 'sidebar', 'flex-grow-column' ],

    draggedWindow: false,
    friends: Ember.computed.alias('store.friends'),

    actions: {
        openModal(modal) {
            this.get('action').dispatch('OPEN_MODAL', { name: modal });
        },

        logout() {
            this.get('action').dispatch('LOGOUT');
        },

        toggleDarkTheme() {
            this.get('action').dispatch('TOGGLE_THEME');
        }
    },

    keyboardShortcuts: {
        'up up down down i o': 'toggleDarkTheme'
    },

    friendsOnline: Ember.computed('friends.@each.online', function() {
        return this.get('friends').filterBy('online', true).length;
    }),

    darkTheme: Ember.computed('store.settings.theme', function() {
        return this.get('store.settings.theme') === 'dark';
    })
});
