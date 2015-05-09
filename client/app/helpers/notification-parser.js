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

/* globals _, isMobile */

import Ember from 'ember';

export default Ember.Object.extend({
    store: null,
    socket: null,

    initReceived: false,
    initBuffer: null,
    mobileDesktop: 0,

    reset() {
        this.set('initBuffer', Ember.A([]));
        this.set('initReceived', false);
        this.set('mobileDesktop', 0);
    },

    process(notification) {
        if (!this.get('initReceived') && notification.id !== 'INITDONE') {
            this.initBuffer.push(notification);
        } else {
            this._handleNotification(notification);
        }
    },

    _handleNotification(notification) {
        let name = notification.id;
        let targetWindow = null;
        let windowId = notification.windowId;

        delete notification.id;

        Ember.Logger.info('← NTF: ' + name);

        if (typeof windowId === 'number') {
            targetWindow = this.get('store.windows').findBy('windowId', windowId);
        }

        let funcName = '_handle' + name.charAt(0) + name.substring(1).toLowerCase();

        if (!this[funcName]) {
            Ember.Logger.warn('Unknown notification received: ' + name);
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
        this.get('store').upsertObject('window', data);
    },

    _handleClose(data, targetWindow) {
        this.get('store.windows').removeObject(targetWindow);
    },

    _handleMsg(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        data.window = targetWindow;
        delete data.windowId;

        this.get('store').upsertObject('message', data, targetWindow);

        let sortedMessages = targetWindow.get('messages').sortBy('ts');

        if (sortedMessages.length > 200) {
            for (let i = 0; i < sortedMessages.length - 200; i++) {
                targetWindow.get('messages').removeObject(sortedMessages[i]);
            }
        }
    },

    _handleInitdone() {
        // An optimization to handle MSG notifications separately in batches
        let addTexts = _.remove(this.initBuffer, function(notification) {
            return notification.id === 'MSG';
        });

        this.initBuffer.forEach(function(notification) {
            this._handleNotification(notification);
        }.bind(this));

        let grouped = _.groupBy(addTexts, function(notification) {
            return notification.windowId;
        });

        Object.keys(grouped).forEach(function(windowId) {
            windowId = parseInt(windowId);
            let windowObject = this.get('store.windows').findBy('windowId', windowId);

            for (let notification of grouped[windowId]) {
                delete notification.windowId;
                notification.window = windowObject;

                this.get('store').upsertObject('message', notification, windowObject);
            }
        }.bind(this));

        // Remove possible deleted windows
        for (let windowObject of this.get('store.windows')) {
            if (windowObject.get('generation') !== this.get('socket.sessionId')) {
                this.get('store.windows').removeObject(windowObject);
            }
        }

        Ember.run.next(this, function() {
            // INITDONE notification usually arrives together with another notifications. These
            // other notifications update property bindings. INITDONE triggers code that
            // assumes these updates have been processed. Therefore initDone must be
            // triggered one run loop round later than everything else.
            this.set('store.initDone', true);
        });

        this.set('initReceived', true);
    },

    _handleUsers(data) {
        for (var userId in data.mapping) { /* jshint -W089 */
            let user = data.mapping[userId];
            this.get('store.users').set('users.' + userId, user);
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
            this._removeUser(userId, targetWindow);

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
            this.get('store.friends').clear();
        }

        for (let friend of data.friends) {
            this.get('store').upsertObject('friend', friend);
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

        this.get('store').upsertObject('alert', data);
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

            this.get('store').upsertObject('alert', {
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
