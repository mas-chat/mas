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

let emojisList = emojify.emojiNames.map((value, i) => ({ id: i, name: value }));

export default Ember.TextArea.extend({
    participants: null,
    pendingClear: false,

    keyPress(e) {
        if (e.keyCode === 13 && !e.shiftKey) {
            e.preventDefault();

            let value = this.get('value');

            if (value !== '') {
                this.sendAction('sendMessage', value);
                this.set('value', '');
                this.$().height('100%');
            }
        }
    },

    input() {
        this._updateHeight();
    },

    nickCompletion: Ember.observer('participants', function() {
        let participants = this.get('participants') || [];
        let nickList = this.get('participants').map(item => item.nick);

        this.$().atwho({
            at: '@',
            data: nickList,
            limit: 15
        });
    }),

    didInsertElement() {
        this.$().atwho({
            at: ':',
            displayTpl: '<li><img src="/app/assets/images/emoji/${name}.png"> ${name}</li>',
            insertTpl: ':${name}:',
            data: emojisList,
            highlightFirst: false,
            limit: 20
        });

        this.$().on('hidden.atwho', function(e, flag, query) {
            e.stopPropagation();
        });
    },

    _updateHeight(height) {
        this.$().height(0);

        let scrollHeight = this.$().prop('scrollHeight');
        let newHeight = Math.min(scrollHeight, 300);

        if (newHeight < 35) {
            newHeight = '100%';
        }

        this.$().height(newHeight);
    }
});
