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

/* globals moment, $ */

import Ember from 'ember';

export default Ember.TextArea.extend({
    pendingSubmit: false,

    keyPress(e) {
        if (e.keyCode == 13 && e.shiftKey === false) {
            this.pendingSubmit = true;
        }
    },

    input() {
        this._updateHeight();

        if (this.pendingSubmit) {
            this.sendAction('sendMessage', this.get('value'));
            this.set('value', '');
            this.$().height('100%');

            this.pendingSubmit = false;
        }
    },

    _updateHeight(height) {
        let contentHeight = this.$().prop('scrollHeight');
        let newHeight = Math.min(contentHeight, 300);

        if (newHeight < 35) {
            newHeight = '100%';
        }

        this.$().height(newHeight);
        console.log(newHeight);
    }
});
