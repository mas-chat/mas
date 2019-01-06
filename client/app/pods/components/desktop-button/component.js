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

import { computed } from '@ember/object';
import Component from '@ember/component';
import { dispatch } from '../../../utils/dispatcher';

export default Component.extend({
  draggedWindow: false,

  dropAreaCSSClass: computed('draggedWindow', function() {
    return this.draggedWindow ? 'main-desktop-droparea' : '';
  }),

  selectedCSSClass: computed('selected', 'id', function() {
    return this.id === this.selected ? 'main-desktop-button-selected' : '';
  }),

  actions: {
    switch() {
      dispatch('CHANGE_ACTIVE_DESKTOP', {
        desktopId: this.id
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
