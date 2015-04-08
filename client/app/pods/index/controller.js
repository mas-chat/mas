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
    activeDraggedWindow: false,

    socket: Ember.inject.service(),
    store: Ember.inject.service(),

    activeDesktop: Ember.computed.alias('store.activeDesktop'),

    actions: {
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
        },

        switchDesktop(desktop) {
            this.set('activeDesktop', desktop);
        },

        dragActiveAction(value) {
            this.set('activeDraggedWindow', value);
        },

        removeFriend(userId) {
            this.send('openModal', 'remove-friend-modal', userId);
        }
    },

    friendsOnline: function() {
        return this.get('friends').filterBy('online', true).length;
    }.property('friends.@each.online'),

    desktops: function() {
        let desktops = {};
        let desktopsArray = Ember.A([]);

        this.get('model').forEach(function(masWindow) {
            let newMessages = masWindow.get('newMessagesCount');
            let desktop = masWindow.get('desktop');
            let initials = masWindow.get('simplifiedName').substr(0, 2).toUpperCase();

            if (desktops[desktop]) {
                desktops[desktop].messages += newMessages;
            } else {
                desktops[desktop] = { messages: newMessages, initials: initials };
            }
        });

        Object.keys(desktops).forEach(function(desktop) {
            desktopsArray.push({
                id: parseInt(desktop),
                initials: desktops[desktop].initials,
                messages: desktops[desktop].messages
            });
        });

        return desktopsArray;
    }.property('model.@each.desktop', 'model.@each.newMessagesCount'),

    deletedDesktopCheck: function() {
        if (!this.get('store.initDone')) {
            return;
        }

        let desktopIds = this.get('desktops').map(d => d.id);

        if (desktopIds.indexOf(this.get('activeDesktop')) === -1) {
            this.set('activeDesktop', this._oldestDesktop());
        }
    }.observes('desktops.@each', 'store.initDone'),

    updateActiveDesktop: function() {
        this.get('socket').send({
            id: 'SET',
            settings: {
                activeDesktop: this.get('activeDesktop')
            }
        });
    }.observes('activeDesktop'),

    _oldestDesktop() {
        return this.get('desktops').map(d => d.id).sort()[0];
    },

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

            window.get('messages').pushObject(messageRecord);
        } else {
            this.get('socket').send({
                id: 'SEND',
                text: text,
                windowId: window.get('windowId')
            }, function(resp) {
                messageRecord.setProperties({
                    body: text,
                    cat: 'mymsg',
                    userId: this.get('store.userId'),
                    ts: moment().unix(),
                    window: window
                });

                window.get('messages').pushObject(messageRecord);
            }.bind(this));
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

    _handleRequestFriend(window, userId) {
        this.get('socket').send({
            id: 'REQUEST_FRIEND',
            userId: userId
        }, function(resp) {
            let message = resp.status === 'OK' ?
                'Request sent. Contact will added to your list when he or she approves.' :
                resp.errorMsg;

            this.get('store.alerts').pushObject({
                message: message,
                dismissible: true,
                report: false,
                postponeLabel: false,
                ackLabel: 'Okay'
            });
        }.bind(this));
    },

    _handleClose(window) {
        this.get('socket').send({
            id: 'CLOSE',
            windowId: window.get('windowId')
        });
    }
});
