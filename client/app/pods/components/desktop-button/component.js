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
    draggedWindow: false,

    dropAreaCSSClass: Ember.computed('draggedWindow', function() {
        return this.get('draggedWindow') ? 'main-desktop-droparea' : '';
    }),

    selectedCSSClass: Ember.computed('selected', 'id', function() {
        return (this.get('id') === this.get('selected')) ? 'main-desktop-button-selected' : '';
    }),

    actions: {
        switch() {
            dispatch('CHANGE_ACTIVE_DESKTOP', {
                desktop: this.get('id')
            });
        },

        switchNext() {
            dispatch('SEEK_ACTIVE_DESKTOP', {
                direction: 1
            });
        },

        switchPrevious() {
            dispatch('SEEK_ACTIVE_DESKTOP', {
                direction: -1
            });
        }
    }
});
