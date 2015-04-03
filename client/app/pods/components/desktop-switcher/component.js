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

    activeDraggedWindow: true,
    selected: 0,

    alphabeticalDesktops: function() {
        let desktops = Ember.A([]);

        for (let i = 0; i < this.get('desktops').length; i++) {
            desktops.push(this._numberToLetter(i));
        }

        return desktops;
    }.property('desktops.@each'),

    actions: {
        switch(desktop) {
            this.sendAction('action', desktop);
        }
    },

    mouseUp(event) {
        // There's a second mouseup handler in window-grid component. That handler manages
        // activeDraggedWindow property. This setup should still be safe because mouseup event
        // bubble first here and then in window-grid. Thus no race condition.
        let draggedWindow = this.get('activeDraggedWindow');

        if (!draggedWindow) {
            return;
        }

        let index = $(event.target).closest('div').data('index');
        index = index === 'new' ? 'new' : parseInt(index);

        if (index === 'new') {
            draggedWindow.set('desktop', this.get('desktops').length);
        } else if (!isNaN(index)) {
            draggedWindow.set('desktop', index);
        }
    },

    _numberToLetter: function(number) {
        return String.fromCharCode(65 + number); // 65 is ASCII 'A'
    }
});
