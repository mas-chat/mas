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

/* globals isMobile */

import Ember from 'ember';

export default Ember.Object.extend({
    store: null,
    socket: null,
    msgBuffer: null,

    mobileDesktop: 0,

    init() {
        this.msgBuffer = [];
    },

    process(notification) {
        let type = notification.id;
        delete notification.id;

        let targetWindow = null;
        let windowId = notification.windowId;

        if (type !== 'MSG') {
            Ember.Logger.info(`← NTF: ${type}`);
        }

        if (typeof windowId === 'number') {
            targetWindow = this.get('store.windows').findBy('windowId', windowId);
        }

        let funcName = '_handle' + type.charAt(0) + type.substring(1).toLowerCase();

        if (!this[funcName]) {
            Ember.Logger.warn('Unknown notification received: ' + type);
        } else {
            this[funcName](notification, targetWindow);
        }
    },

    _handleCreate(data) {
        if (isMobile.any) {
            // Couldn't find a nice way to do this in a model. In mobile mode we show only one
            // window per desktop.
            data.desktop = this.incrementProperty('mobileDesktop');
        }

        data.generation = this.get('socket.sessionId');

        // A hack to prevent the client to echo new values immediately back to the server.
        window.disableUpdate = true;
        this.get('store').upsertModel('window', data);
        window.disableUpdate = false;
    },

    _handleClose(data, targetWindow) {
        this.get('store').removeModel('window', targetWindow);
    },

    _handleMsg(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        delete data.windowId;

        if (!this.get('store.windowListComplete')) {
            // Optimization: Avoid re-renders after every message
            this.msgBuffer.push({ data: data, parent: targetWindow });
        } else {
            this.get('store').upsertModel('message', data, targetWindow);
        }
    },

    _handleInitdone() {
        // Remove possible deleted windows.
        let deletedWindows = [];

        for (let windowObject of this.get('store.windows')) {
            if (windowObject.get('generation') !== this.get('socket.sessionId')) {
                deletedWindows.push(windowObject);
            }
        }

        this.get('store').removeModels('window', deletedWindows);

        // Insert buffered message in one go.
        Ember.Logger.info(`MsgBuffer processing started.`);

        for (let i = 0; i < this.msgBuffer.length; i++) {
            let item = this.msgBuffer[i];
            this.get('store').upsertModel('message', item.data, item.parent);
        }

        Ember.Logger.info(`MsgBuffer processing ended.`);

        this.msgBuffer = [];
        this.set('store.windowListComplete', true);
    },

    _handleUsers(data) {
        for (let userId in data.mapping) {
            this.set('store.users.users.' + userId, data.mapping[userId]);
        }

        this.get('store.users').incrementProperty('isDirty');
    },

    _handleAddmembers(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        if (data.reset) {
            targetWindow.operators.clear();
            targetWindow.voices.clear();
            targetWindow.users.clear();
        }

        data.members.forEach(function(member) {
            let userId = member.userId;

            if (!data.reset) {
                this._removeUser(userId, targetWindow);
            }

            switch (member.role) {
                case '@':
                    targetWindow.operators.pushObject(userId);
                    break;
                case '+':
                    targetWindow.voices.pushObject(userId);
                    break;
                default:
                    targetWindow.users.pushObject(userId);
                    break;
            }
        }.bind(this));
    },

    _handleDelmembers(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        data.members.forEach(function(member) {
            this._removeUser(member.userId, targetWindow);
        }.bind(this));
    },

    _handleUpdate(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        // A hack to prevent the client to echo new values immediately back to the server.
        window.disableUpdate = true;
        targetWindow.setProperties(data);
        window.disableUpdate = false;
    },

    _handleFriends(data) {
        if (data.reset) {
            this.get('store').clearModels('friend');
        }

        for (let friend of data.friends) {
            this.get('store').upsertModel('friend', friend);
        }
    },

    _handleAlert(data) {
        // Default labels for server generated alerts
        data.postponeLabel = 'Show again later';
        data.ackLabel = 'Dismiss';

        data.resultCallback = function(result) {
            if (result === 'ack') {
                this.get('socket').send({
                    id: 'ACKALERT',
                    alertId: data.alertId
                });
            }
        }.bind(this);

        this.get('store').upsertModel('alert', data);
    },

    _handleNetworks(data) {
        this.get('store.networks').setObjects(data.networks);
    },

    _handleSet(data) {
        if (!data.settings) {
            return;
        }

        if (typeof(data.settings.activeDesktop) !== 'undefined') {
            this.set('store.activeDesktop', data.settings.activeDesktop);
        }

        this.set('store.email', data.settings.email);
        this.set('store.emailConfirmed', data.settings.emailConfirmed);
    },

    _handleFriendsconfirm(data) {
        let socket = this.get('socket');
        let users = this.get('store.users');

        function resultHandler(userId) {
            return function(result) {
                if (result === 'ack' || result === 'nack') {
                    socket.send({
                        id: 'FRIEND_VERDICT',
                        userId: userId,
                        allow: result === 'ack'
                    });
                }
            };
        }

        data.friends.forEach(function(friendCandidate) {
            let realName = users.getName(friendCandidate.userId);
            let nick = users.getNick(friendCandidate.userId, 'MAS');

            this.get('store').upsertModel('alert', {
                message: `Allow ${realName} (${nick}) to add you to his/her contacts list?`,
                alertId: friendCandidate.userId,
                dismissible: true,
                report: false,
                postponeLabel: 'Decide later',
                nackLabel: 'Ignore',
                ackLabel: 'Allow',
                resultCallback: resultHandler(friendCandidate.userId)
            });
        }.bind(this));
    },

    _removeUser(userId, targetWindow) {
        targetWindow.operators.removeObject(userId);
        targetWindow.voices.removeObject(userId);
        targetWindow.users.removeObject(userId);
    }
});
