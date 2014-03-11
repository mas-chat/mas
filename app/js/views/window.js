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

require('../../libs/imagesloaded/imagesloaded.js');

App.WindowView = Ember.View.extend({
    classNames: ['window', 'flex-grow-column', 'flex-1'],
    $messagePanel: 0,
    scrolling: false,

    scrollToBottom: function() {
        if (!this.get('scrolling')) {
            var duration = this.$messagePanel.scrollTop() === 0 ? 1 : 800;
            var that = this;

            this.$messagePanel.stop().animate({
                scrollTop: this.$messagePanel.prop('scrollHeight')
            }, duration, function() {
                that.set('scrolling', false);
            });

            this.set('scrolling', true);
        }
    },

    onChildViewsChanged: function() {
        if (this.$messagePanel) {
            this.scrollToBottom();
        }
    }.observes('childViews'),

    didInsertElement: function() {
        this.$messagePanel = this.$('.window-messages');
        this.$().on('load', 'img', $.proxy(this.scrollToBottom, this));
        this.scrollToBottom();

        // Highlight the window that was moved
        if (this.get('controller.model.animate') === true) {
            this.set('controller.model.animate', false);
            this.$().addClass('pulse animated');
        }
    },

    willDestroyElement: function(){
        this.$().off('load', 'img', $.proxy(this.scrollToBottom, this));
    }
});
