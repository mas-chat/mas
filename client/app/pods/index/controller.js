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

/* global $, _, moment */

import Ember from 'ember';

export default Ember.ArrayController.extend({
    friends: null,

    socket: Ember.inject.service(),
    store: Ember.inject.service(),

    actions: {
        show(window) {
            window.set('visible', true);

            if (!window.get('scrollLock')) {
                window.set('newMessagesCount', 0);
            }
        },

        logout() {
            this.get('socket').send({ id: 'LOGOUT' }, function() {
                $.removeCookie('auth', { path: '/' });
                window.location = '/';
            });
        },

        windowAction(command, window, value) {
            this['_handle' + _.capitalize(command)](window, value);
        },

        menuAction(command, window) {
            let modals = {
                editPassword: 'password-modal',
                editTopic: 'topic-modal',
                editAlerts: 'alerts-modal',
                takePhoto: 'capture-modal'
            };

            this.send('openModal', modals[command], window);
        }
    },

    sortedHiddenWindows: function() {
        return this.get('model').filter(function(val) {
            return !val.get('visible');
        }).sortBy('timeHidden');
    }.property('model.@each.visible'),

    friendsOnline: function() {
        return this.get('friends').filterBy('online', true).length;
    }.property('friends.@each.online'),

    _handleSendMessage(window, text) {
        let messageRecord = this.get('container').lookup('model:message');
        let isCommand = text.charAt(0) === '/';
        let ircServer1on1 = window.get('type') === '1on1' && window.get('userId') === 'iSERVER';

        if (ircServer1on1 && !isCommand) {
            messageRecord.setProperties({
                body: 'Only commands allowed, e.g. /whois john',
                cat: 'error',
                ts: moment().unix(),
                window: window
            });
        } else {
            this.get('socket').send({
                id: 'SEND',
                text: text,
                windowId: window.get('windowId')
            });

            messageRecord.setProperties({
                body: text,
                cat: 'mymsg',
                userId: this.get('store.userId'),
                ts: moment().unix(),
                window: window
            });
        }

        if (!isCommand) {
            window.get('messages').pushObject(messageRecord);
        }
    },

    _handleChat(window, userId) {
        this.get('socket').send({
            id: 'CHAT',
            userId: userId
        }, function(resp) {
            if (resp.status !== 'OK') {
                this.send('openModal', 'info-modal', { title: 'Error', body: resp.errorMsg });
            }
        }.bind(this));
    },

    _handleWhois(window, userId) {
        this.get('socket').send({
            id: 'WHOIS',
            windowId: window.get('windowId'),
            userId: userId
        });
    },

    _handleOp(window, userId) {
        this.get('socket').send({
            id: 'OP',
            windowId: window.get('windowId'),
            userId: userId
        });
    },

    _handleKick(window, userId) {
        this.get('socket').send({
            id: 'KICK',
            windowId: this.get('content.windowId'),
            userId: userId
        });
    },

    _handleKickban(window, userId) {
        this.get('socket').send({
            id: 'KICKBAN',
            windowId: window.get('windowId'),
            userId: userId
        });
    },

    _handleClose(window) {
        this.get('socket').send({
            id: 'CLOSE',
            windowId: window.get('windowId')
        });
    }
});
