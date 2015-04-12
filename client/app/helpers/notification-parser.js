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

/* globals _ */

import Ember from 'ember';

export default Ember.Object.extend({
    socket: Ember.inject.service(),
    store: Ember.inject.service(),

    initReceived: false,
    initBuffer: [],

    process(notification) {
        if (!this.initReceived && notification.id !== 'INITDONE') {
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
        // This hack can be removed if there's a way to create and init the object in one go as
        // syncServer() observer doesn't have .on('init').
        window.disableUpdate = true;
        let windowRecord = this.get('container').lookup('model:window').setProperties(data);
        window.disableUpdate = false;

        this.get('store.windows').pushObject(windowRecord);
    },

    _handleClose(data, targetWindow) {
        this.get('store.windows').removeObject(targetWindow);
    },

    _handleAddtext(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        data.window = targetWindow;
        delete data.windowId;

        let messageRecord = this.get('container').lookup('model:message').setProperties(data);

        let messages = targetWindow.messages;

        if (messages.length > 200) {
            messages.shiftObject();
        }

        messages.pushObject(messageRecord);
    },

    _handleInitdone() {
        // An optimization to handle ADDTEXT notifications separately in batches
        let addTexts = _.remove(this.initBuffer, function(notification) {
            return notification.id === 'ADDTEXT';
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

            let messages = _.map(grouped[windowId], function(notification) {
                delete notification.windowId;
                notification.window = windowObject;

                return this.get('container').lookup('model:message').setProperties(notification);
            }.bind(this));

            let targetWindow = this.get('store.windows').findBy('windowId', windowId);

            // Now we are able to update the whole window backlog in one go.
            targetWindow.messages.pushObjects(messages);
        }.bind(this));

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

        data.friends.forEach(function(details) {
            let friend = this.get('store.friends').findBy('userId', details.userId);

            if (!friend) {
                let friendRecord =
                    this.get('container').lookup('model:friend').setProperties(details);
                this.get('store.friends').pushObject(friendRecord);
            } else {
                friend.set('online', details.online);

                if (details.last) {
                    friend.set('last', details.last);
                }
            }
        }.bind(this));
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

        this.get('store.alerts').pushObject(data);
    },

    _handleNetworks(data) {
        this.get('store.networks').pushObjects(data.networks);
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

            this.get('store.alerts').pushObject({
                message: `Allow ${realName} (${nick}) to add you to his/her contacts list?`,
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
