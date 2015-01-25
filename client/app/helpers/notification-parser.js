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

import Ember from 'ember';

export default Ember.Object.extend({
    process: function(command) {
        let name = command.id;
        let targetWindow = null;
        let windowId = command.windowId;

        delete command.id;

        Ember.Logger.info('<-- NTF: ' + name);

        if (typeof windowId === 'number') {
            targetWindow = this.get('store.windows').findBy('windowId', windowId);
        }

        let funcName = '_handle' + name.charAt(0) + name.substring(1).toLowerCase();

        if (!this[funcName]) {
            Ember.Logger.warn('Unknown command received: ' + name);
        } else {
            this[funcName](command, targetWindow);
        }
    },

    _handleCreate: function(data) {
        let windowRecord = this.get('container').lookup('model:window').setProperties(data);
        this.get('store.windows').pushObject(windowRecord);
    },

    _handleClose: function(data, targetWindow) {
        this.get('store.windows').removeObject(targetWindow);
    },

    _handleAddtext: function(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        data.window = targetWindow;
        delete data.windowId;

        let messageRecord = this.get('container').lookup('model:message').setProperties(data);

        let messages = targetWindow.messages;

        if (messages.length > 200) {
            messages.shiftObject();
            targetWindow.deletedLine = true;
        }

        messages.pushObject(messageRecord);
    },

    _handleInitdone: function() {
        // INITDONE command usually arrives together with another commands. These
        // other commands update property bindings. INITDONE triggers code that
        // assumes these updates have been processed. Therefore INITDONE must be
        // processed one run loop round later than everything else.
        Ember.run.next(this, function() {
            this.get('container').lookup('controller:application').set('initDone', true);
        });
    },

    _handleUsers: function(data) {
        for (var userId in data.mapping) { /* jshint -W089 */
            let user = data.mapping[userId];
            this.get('store.users').set('users.' + userId, user);
        }

        this.get('store.users').incrementProperty('isDirty');
    },

    _handleAddmembers: function(data, targetWindow) {
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

    _handleDelmembers: function(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        data.members.forEach(function(member) {
            this._removeUser(member.userId, targetWindow);
        }.bind(this));
    },

    _handleUpdate: function(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        targetWindow.setProperties(data);
    },

    _handleFriends: function(data) {
        this.get('store.friends').clear();

        data.friends.forEach(function(newFriend) {
            let friendRecord = this.get('container').lookup('model:friend')
              .setProperties(newFriend);
            this.get('store.friends').pushObject(friendRecord);
        }.bind(this));
    },

    _handleFriendsupdate: function(data) {
        let friend = this.get('store.friends').findBy('userId', data.userId);
        friend.set('online', data.online);
        if (data.last) {
            friend.set('last', data.last);
        }
    },

    _removeUser: function(userId, targetWindow) {
        targetWindow.operators.removeObject(userId);
        targetWindow.voices.removeObject(userId);
        targetWindow.users.removeObject(userId);
    }
});
