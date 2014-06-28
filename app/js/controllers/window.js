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

var sound = require('../helpers/sound');

Mas.WindowController = Ember.ObjectController.extend({
    actions: {
        moveRowUp: function() {
            this._seekRow(-1);
        },

        moveRowDown: function() {
            this._seekRow(1);
        },

        hide: function() {
            this.set('visible', false);
            this.set('timeHidden', Date.now());
            this.set('newMessagesCount', 0);
        },

        close: function() {
            Mas.networkMgr.send({
                id: 'CLOSE',
                windowId: this.get('windowId')
            });
        },

        sendMessage: function() {
            var text = this.get('newMessage');

            Mas.networkMgr.send({
                id: 'SEND',
                text: text,
                windowId: this.get('windowId')
            });
            this.set('newMessage', '');

            this.get('messages').pushObject(Mas.Message.create({
                body: text,
                cat: 'mymsg',
                nick: Mas.nicks[this.get('network')],
                ts: moment().unix()
            }));
        },

        chat: function(nick) {
            Mas.networkMgr.send({
                id: 'CHAT',
                windowId: this.get('windowId'),
                nick: nick
            });
        },

        whois: function(nick) {
            Mas.networkMgr.send({
                id: 'WHOIS',
                windowId: this.get('windowId'),
                nick: nick
            });
        },

        op: function(nick) {
            Mas.networkMgr.send({
                id: 'OP',
                windowId: this.get('windowId'),
                nick: nick
            });
        },

        kick: function(nick) {
            Mas.networkMgr.send({
                id: 'KICK',
                windowId: this.get('windowId'),
                nick: nick
            });
        },

        kickban: function(nick) {
            Mas.networkMgr.send({
                id: 'KICKBAN',
                windowId: this.get('windowId'),
                nick: nick
            });
        }
    },

    newMessageReceived: function() {
        this.incrementProperty('newMessagesCount');

        if (this.get('messages').length > 200) {
            this.get('messages').shiftObject();
        }

        if (document.hidden) {
            // Browser title notification
            if (this.get('titleAlert')) {
                titlenotifier.add();
            }

            // Sound notification
            if (this.get('sounds')) {
                sound.play();
            }
        }
    }.observes('messages.@each'),

    isGroup: function() {
        return this.get('type') === 'group';
    }.property('type'),

    cssType: function() {
        if (this.get('type') === 'group') {
            return 'group';
        } else {
            // 1on1 is not valid css class name
            return 'private-1on1';
        }
    }.property('type'),

    _seekRow: function(direction) {
        var newRow = this.get('parentController').nextRow(this.get('model'), direction);
        this.set('row', newRow);
        this.set('animate', true);
    }
});
