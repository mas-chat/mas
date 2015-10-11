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

/* globals isMobile */

import Ember from 'ember';
import { dispatch } from './dispatcher';

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
            targetWindow = this.get('store.windows').getByIndex(windowId);
        }

        let handler = `_handle${type.charAt(0)}${type.substring(1).toLowerCase()}`;

        if (!this[handler]) {
            Ember.Logger.warn(`Unknown notification received: ${type}`);
        } else {
            this[handler](notification, targetWindow);
        }
    },

    _handleCreate(data) {
        if (isMobile.any) {
            // Couldn't find a nice way to do this in a model. In mobile mode we show only one
            // window per desktop.
            data.desktop = this.incrementProperty('mobileDesktop');
        }

        data.generation = this.get('socket.sessionId');
        data.store = this.get('store');

        this.get('store.windows').upsertModel(data);
    },

    _handleClose(data, targetWindow) {
        this.get('store.windows').removeModel(targetWindow);
    },

    _handleMsg(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        delete data.windowId;
        data.window = targetWindow;
        data.store = this.get('store');

        if (!this.get('store.initDone')) {
            // Optimization: Avoid re-renders after every message
            this.msgBuffer.push({ data: data, parent: targetWindow });
        } else {
            targetWindow.get('messages').upsertModel(data);
        }
    },

    _handleInitdone() {
        // Remove possible deleted windows.
        let deletedWindows = [];

        this.get('store.windows').forEach(windowObject => {
            if (windowObject.get('generation') !== this.get('socket.sessionId')) {
                deletedWindows.push(windowObject);
            }
        });

        this.get('store.windows').removeModels(deletedWindows);

        // Insert buffered message in one go.
        Ember.Logger.info(`MsgBuffer processing started.`);

        for (let i = 0; i < this.msgBuffer.length; i++) {
            let item = this.msgBuffer[i];
            item.parent.get('messages').upsertModel(item.data);
        }

        Ember.Logger.info(`MsgBuffer processing ended.`);

        this.msgBuffer = [];
        this.set('store.initDone', true);
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
        if (targetWindow) {
            targetWindow.setModelProperties(data);
        }
    },

    _handleFriends(data) {
        dispatch('ADD_FRIENDS', data);
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

        this.get('store.alerts').upsertModel(data);
    },

    _handleNetworks(data) {
        this.get('store.networks').setObjects(data.networks);
    },

    _handleSet(data) {
        let settings = data.settings;

        if (!settings) {
            return;
        }

        if (isMobile.any) {
            settings.activeDesktop = 1;
        }

        this.get('store.settings').setProperties(settings);
    },

    _handleFriendsconfirm(data) {
        dispatch('CONFIRM_FRIENDS', data);
    },

    _removeUser(userId, targetWindow) {
        targetWindow.operators.removeObject(userId);
        targetWindow.voices.removeObject(userId);
        targetWindow.users.removeObject(userId);
    }
});
