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
import Users from '../helpers/users';
import Window from '../models/window';
import Message from '../models/message';
import Friend from '../models/friend';
import Alert from '../models/alert';

const modelNameMapping = {
    window: Window,
    message: Message,
    logMessage: Message,
    friend: Friend,
    alert: Alert
};

export default Ember.Service.extend({
    socket: Ember.inject.service(),

    users: null,
    friends: null,
    windows: null,
    alerts: null,
    networks: null,

    activeDesktop: null,
    userId: null,
    windowListComplete: false,
    maxBacklogMsgs: 100000,

    init() {
        this._super();

        this.set('users', Users.create());
        this.set('friends', Ember.A([]));
        this.set('windows', Ember.A([]));
        this.set('alerts', Ember.A([]));
        this.set('networks', Ember.A([]));

        // We are service and fully initialized only after this run loop.
        Ember.run.next(this, function() {
            if (typeof Storage !== 'undefined') {
                this._loadSnapshot();

                setInterval(function() {
                    Ember.run.next(this, this._saveSnapshot);
                }.bind(this), 60 * 1000); // Once in a minute
            }

            // If there's a snapshot it has been pushed to store now. It's safe to start
            // socket.io connection. Data from server can't race anymore with snapshot data.
            this.get('socket').start();
        });
    },

    upsertObject(type, data, parent) {
        let primaryKeys = {
            window: 'windowId',
            message: 'gid',
            friend: 'userId',
            alert: 'alertId'
        };

        return this._upsert(data, primaryKeys[type], type, parent || this);
    },

    _upsert(data, primaryKey, type, parent) {
        let object = parent.get(type + 's').findBy(primaryKey, data[primaryKey]);

        if (object) {
            object.setProperties(data);
        } else {
            object = this._insertObject(type, data, parent);
        }

        return object;
    },

    _insertObject(type, data, parent) {
        let object = modelNameMapping[type].create(data);

        // TBD: Add 'arrayName' parameter so that logMessage type can be removed.

        if (type === 'window' || type === 'message' || type === 'logMessage' || type === 'friend') {
            object.set('store', this);
        }

        if (type === 'window') {
            object.set('socket', this.get('socket'));
        }

        if (type === 'message' || type === 'logMessage') {
            object.set('window', parent);
        }

        return parent.get(type + 's').pushObject(object);
    },

    _saveSnapshot() {
        if (!this.get('windowListComplete')) {
            return;
        }

        let data = { windows: [], users: {} };

        for (let masWindow of this.get('windows')) {
            let messages = [];

            for (let message of masWindow.get('messages')) {
                let messageData = message.getProperties([
                    'gid',
                    'body',
                    'cat',
                    'ts',
                    'userId',
                    'type',
                    'hideImages'
                ]);

                messages.push(messageData);
                data.users[messageData.userId] = true;
            }

            let windowProperties = masWindow.getProperties([
                'windowId',
                'generation',
                'name',
                'userId',
                'network',
                'type',
                'row',
                'column',
                'desktop',
                'visible',
                'newMessagesCount'
            ]);

            windowProperties.messages = messages;
            data.windows.push(windowProperties);
        }

        for (let userId of Object.keys(data.users)) {
            data.users[userId] = this.get('users.users.' + userId);
        }
        data.activeDesktop = this.get('activeDesktop');

        window.localStorage.setItem('data', JSON.stringify(data));
        Ember.Logger.info('Snapshot saved.');
    },

    _loadSnapshot() {
        try {
            let data = JSON.parse(window.localStorage.getItem('data'));

            if (!data || !data.activeDesktop) {
                Ember.Logger.info('Snapshot not found.');
                return;
            }

            this.set('activeDesktop', data.activeDesktop);

            for (var userId of Object.keys(data.users)) { /* jshint -W089 */
                this.set('users.users.' + userId, data.users[userId]);
            }

            this.get('users').incrementProperty('isDirty');

            for (let windowData of data.windows) {
                let windowObject = this.upsertObject('window', windowData);

                for (let messageData of windowData.messages) {
                    this.upsertObject('message', messageData, windowObject);
                }
            }

            this.set('windowListComplete', true);
            Ember.Logger.info('Snapshot loaded successfully.');
        } catch (e) {
            Ember.Logger.info(`Failed to load snapshot: ${e}`);
        }
    }
});
