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
    classNames: [ 'main-desktop-switcher' ],

    selected: 0,
    $pointer: null,

    alphabeticalDesktops: function() {
        let desktops = Ember.A([]);

        for (let i = 0; i < this.get('desktops').length; i++) {
            desktops.push(this._numberToLetter(i));
        }

        return desktops;
    }.property('desktops.@each'),

    updatePointer: function() {
        Ember.run.scheduleOnce('afterRender', this, function() {
            this.movePointer(true);
        });
    }.observes('alphabeticalDesktops.@each', 'selected'),

    actions: {
        switch(desktop) {
            this.set('selected', desktop);
            this.sendAction('action', desktop);
        }
    },

    didInsertElement() {
        this.$pointer = this.$('.main-desktop-button-selected-rectangle');
        this.movePointer(true);
    },

    movePointer(animate) {
        let pos = this.$('[data-desktop="' + this.selected + '"]').offset();

        this.$pointer.velocity('stop').velocity({
            top: pos.top - 2,
            left: pos.left - 2
        }, {
            duration: animate ? 400 : 0,
            visibility: 'visible'
        });
    },

    _numberToLetter: function(number) {
        return String.fromCharCode(65 + number); // 65 is ASCII 'A'
    }
});
