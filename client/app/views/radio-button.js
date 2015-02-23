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

export default Ember.View.extend({
    tagName: 'input',
    attributeBindings: [ 'type', 'value', 'checked:checked:' ],
    type: 'radio',

    selection: null,

    click() {
        this.set('selection', this.$().val());
    },

    checked: function() {
        return this.get('value') === this.get('selection');
    }.property(),

    updateValue: function() {
        if (this.get('selection') === this.$().val()) {
            return this.set('checked', true);
        }
        return this.set('checked', false);
    }.observes('selection')
});
