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

/* globals $ */

import Ember from 'ember';

export default Ember.Component.extend({
    store: Ember.inject.service(),
    socket: Ember.inject.service(),

    classNames: [ 'main-desktop-switcher' ],

    activeDesktop: Ember.computed.alias('store.activeDesktop'),
    activeDraggedWindow: Ember.computed.alias('store.activeDraggedWindow'),
    windows: Ember.computed.alias('store.windows'),

    actions: {
        switch(desktop) {
            this.set('activeDesktop', desktop);
        }

        switchNext() {
            this._seekDesktop(1);
        }

        switchPrevious() {
            this._seekDesktop(-1);
        }
    },

    _seekDesktop(direction) {
        let desktops = this.get('desktops');
        let index = desktops.indexOf(desktops.findBy('id', this.get('activeDesktop')));

        index += direction;

        if index === desktops.length {
            index = 0;
        } else if (index === -1) {
            index = desktops.length - 1;
        }

        this.set('activeDesktop', desktops[index].id);
    },

    desktops: Ember.computed('windows.@each.desktop', 'windows.@each.newMessagesCount', function() {
        console.log(this.get('activeDesktop'))

        let desktops = {};
        let desktopsArray = Ember.A([]);

        this.get('windows').forEach(function(masWindow) {
            let newMessages = masWindow.get('newMessagesCount');
            let desktop = masWindow.get('desktop');
            let initials = masWindow.get('simplifiedName').substr(0, 2).toUpperCase();

            if (desktops[desktop]) {
                desktops[desktop].messages += newMessages;
            } else {
                desktops[desktop] = { messages: newMessages, initials: initials };
            }
        });

        Object.keys(desktops).forEach(function(desktop) {
            desktopsArray.push({
                id: parseInt(desktop),
                initials: desktops[desktop].initials,
                messages: desktops[desktop].messages
            });
        });

        return desktopsArray;
    }),

    deletedDesktopCheck: Ember.observer('desktops.[]', 'store.initDone', function() {
        if (!this.get('store.initDone')) {
            return;
        }

        let desktopIds = this.get('desktops').map(d => d.id);

        if (desktopIds.indexOf(this.get('activeDesktop')) === -1) {
            this.set('activeDesktop', this._oldestDesktop());
        }
    }),

    updateActiveDesktop: Ember.observer('activeDesktop', function() {
        if (!isMobile.any) {
            this.get('socket').send({
                id: 'SET',
                settings: {
                    activeDesktop: this.get('activeDesktop')
                }
            });
        }
    }),

    _oldestDesktop() {
        return this.get('desktops').map(d => d.id).sort()[0];
    }
});
