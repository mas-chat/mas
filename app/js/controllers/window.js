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

App.WindowController = Ember.ObjectController.extend({
    actions: {
        moveRowUp: function() {
            this._moveWindow(this.get('windowId'), -1);
        },
        moveRowDown: function() {
            this._moveWindow(this.get('windowId'), 1);
        }
    },

    processedMessages: function() {
        return this.get('messages').map(function(value) {
            var cat = value.get('cat');

            if (cat === 'banner') {
                value.set('ircMotd', true);
                value.set('body', value.get('body').replace(/ /g, '&nbsp;'));
            }

            if (cat === 'banner' || cat === 'notice') {
                value.set('nick', '');
            } else {
                value.set('nick', '<' + value.get('nick') + '>');
            }

            return value;
        });
    }.property('messages'),

    newMessage: function() {
        Ember.run.next(this, function() {
            var $messagePanel = $('#' + this.get('windowId') + ' .window-messages');
            $messagePanel.scrollTop($messagePanel.prop('scrollHeight'));
        });
    }.observes('messages').on('init'),

    _moveWindow: function(id, direction) {
        this.set('row', this.get('row') + direction);
        var that = this;

        Ember.run.next(this, function() {
            // Highlight the moved window
            $('#' + that.get('windowId')).addClass('tada animated');
        });
    }
});
