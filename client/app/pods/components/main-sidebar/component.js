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

import { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
// import KeyboardShortcuts from 'ember-keyboard-shortcuts/mixins/component';
import { dispatch } from '../../../utils/dispatcher';

export default Component.extend(
  /* KeyboardShortcuts, */ {
    stores: service(),

    classNames: ['sidebar', 'flex-grow-column'],

    draggedWindow: false,
    friends: alias('stores.friends.friends'),
    canUseIRC: alias('stores.settings.canUseIRC'),

    actions: {
      openModal(modal) {
        dispatch('OPEN_MODAL', { name: modal });
      },

      logout() {
        dispatch('LOGOUT');
      },

      logoutAll() {
        dispatch('LOGOUT', { allSessions: true });
      },

      toggleDarkTheme() {
        dispatch('TOGGLE_THEME');
      }
    },

    keyboardShortcuts: {
      'up up down down i o': 'toggleDarkTheme'
    },

    friendsOnline: computed('friends.@each.online', function() {
      return this.get('friends').filterBy('online', true).length;
    }),

    darkTheme: computed('stores.settings.theme', function() {
      return this.get('stores.settings.theme') === 'dark';
    })
  }
);
