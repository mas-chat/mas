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

/* global $, moment, isMobile */

import Ember from 'ember';
import SendMsgMixin from '../../../mixins/sendMsg';
import KeyboardShortcuts from 'ember-keyboard-shortcuts/mixins/component';

export default Ember.Component.extend(SendMsgMixin, KeyboardShortcuts, {
    socket: Ember.inject.service(),
    store: Ember.inject.service(),

    classNames: [ 'flex-grow-column', 'flex-1' ],

    modalQueue: Ember.A([]),

    actions: {
        openModal(modalName, model) {
            // New modal goes to a queue if there's already a modal open.
            this.get('modalQueue').pushObject({
                name: modalName,
                model: model
            });
        },

        windowAction(command, ...values) {
            this[`_handle${command.capitalize()}`](...values);
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

        activateHackerMode() {
            $('<link/>', {
                rel: 'stylesheet',
                type: 'text/css',
                href: '/app/theme-hacker.css'
            }).appendTo('head');
        }
    },

    keyboardShortcuts: {
        'up up down down i o': 'activateHackerMode'
    },

    _handleSendMessage(window, text) {
        let command = false;
        let commandParams;

        if (text.charAt(0) === '/') {
            let data = /^(\S*)(.*)/.exec(text.substring(1));
            command = data[1] ? data[1].toLowerCase() : '';
            commandParams = data[2] ? data[2] : '';
        }

        let ircServer1on1 = window.get('type') === '1on1' && window.get('userId') === 'iSERVER';

        if (ircServer1on1 && !command) {
            // Note that only one error is shown because of the shared fixed gid (=primary key).
            this.get('store').upsertModel('message', {
                body: 'Only commands allowed, e.g. /whois john',
                cat: 'error',
                ts: moment().unix(),
                gid: 'error'
            }, window);
            return;
        }

        if (command === 'help') {
            this.send('openModal', 'help-modal');
            return;
        }

        // TBD: /me on an empty IRC channel is not shown to the sender.

        if (command) {
            this.get('socket').send({
                id: 'COMMAND',
                command: command,
                params: commandParams.trim(),
                windowId: window.get('windowId')
            }, function(resp) {
                if (resp.status !== 'OK') {
                    this.send('openModal', 'info-modal', { title: 'Error', body: resp.errorMsg });
                }
            }.bind(this));
            return;
        }

        this._sendText(text, window);
    },

    _handleEditMessage(window, gid, text) {
        this.get('socket').send({
            id: 'EDIT',
            windowId: window.get('windowId'),
            gid: gid,
            text: text
        }, function(resp) {
            if (resp.status !== 'OK') {
                this.send('openModal', 'info-modal', { title: 'Error', body: resp.errorMsg });
            }
        }.bind(this));
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

            this.get('store').upsertModel('alert', {
                alertId: `internal:${Date.now()}`,
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
