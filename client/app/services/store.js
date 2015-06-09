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

/* globals moment */

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

const primaryKeys = {
    window: 'windowId',
    message: 'gid',
    logMessage: 'gid',
    friend: 'userId',
    alert: 'alertId'
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
    dayCounter: 0,

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

        this._startDayChangedService();
    },

    insertModels(type, models, parent) {
        parent = parent || this;

        let objects = [];
        let primaryKeyName = primaryKeys[type];

        this._ensureLookupTableExists(type, parent);

        for (let data of models) {
            let object = this._createModel(type, data, parent);
            let primaryKey = data[primaryKeyName];

            objects.push(object);
            parent.lookupTable[type][primaryKey] = object;
        }

        parent.get(type + 's').pushObjects(objects);
    },

    upsertModel(type, data, parent) {
        return this._upsert(data, primaryKeys[type], type, parent || this);
    },

    removeModel(type, object, parent) {
        this.removeModels(type, [ object ], parent);
    },

    removeModels(type, objects, parent) {
        parent = parent || this;

        for (let object of objects) {
            let primaryKeyName = primaryKeys[type];
            let primaryKeyValue = object[primaryKeyName];

            delete parent.lookupTable[type][primaryKeyValue];
        }

        parent.get(type + 's').removeObjects(objects);
    },

    clearModels(type, parent) {
        parent = parent || this;

        delete parent.lookupTable[type];
        this.get(type + 's').clear();
    },

    _startDayChangedService() {
        // Day has changed service
        let timeToTomorrow = moment().endOf('day').diff(moment()) + 1;

        let changeDay = function() {
            this.incrementProperty('dayCounter');
            Ember.run.later(this, changeDay, 1000 * 60 * 60 * 24);
        };

        Ember.run.later(this, changeDay, timeToTomorrow);
    },

    _upsert(data, primaryKeyName, type, parent) {
        this._ensureLookupTableExists(type, parent);
        let object = parent.lookupTable[type][data[primaryKeyName]];

        if (object) {
            if (type === 'message') {
                return object; // TBD: Must be removed when messages are editable.
            }

            delete data[primaryKeyName];
            object.setProperties(data);
        } else {
            object = this._insertObject(type, data, parent);
            parent.lookupTable[type][data[primaryKeyName]] = object;
        }

        return object;
    },

    _insertObject(type, data, parent) {
        let object = this._createModel(type, data, parent);
        return parent.get(type + 's').pushObject(object);
    },

    _createModel(type, data, parent) {
        let object = modelNameMapping[type].create(data);

        // TBD: Add 'arrayName' parameter so that logMessage type and primary key can be removed.

        if (type === 'window' || type === 'message' || type === 'logMessage' || type === 'friend') {
            object.set('store', this);
        }

        if (type === 'window') {
            object.set('socket', this.get('socket'));
        }

        if (type === 'message' || type === 'logMessage') {
            object.set('window', parent);
        }

        return object;
    },

    _ensureLookupTableExists(type, parent) {
        if (!parent.lookupTable) {
            parent.lookupTable = {};
        }

        if (!parent.lookupTable[type]) {
            parent.lookupTable[type] = {};
        }
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
                'newMessagesCount',
                'minimizedNamesList'
            ]);

            windowProperties.messages = messages;
            data.windows.push(windowProperties);
        }

        for (let userId of Object.keys(data.users)) {
            data.users[userId] = this.get('users.users.' + userId);
        }
        data.activeDesktop = this.get('activeDesktop');

        try {
            window.localStorage.setItem('data', JSON.stringify(data));
            Ember.Logger.info('Snapshot saved.');
        } catch (e) {
            Ember.Logger.info(`Failed to save snapshot: ${e}`);
        }
    },

    _loadSnapshot() {
        try {
            Ember.Logger.info('Starting to load saved snapshot.');

            let data = JSON.parse(window.localStorage.getItem('data'));

            if (!data || !data.activeDesktop) {
                Ember.Logger.info('Snapshot not found.');
                return;
            }

            Ember.Logger.info('Snapshot loaded.');

            this.set('activeDesktop', data.activeDesktop);

            for (let userId of Object.keys(data.users)) {
                this.set('users.users.' + userId, data.users[userId]);
            }

            this.get('users').incrementProperty('isDirty');

            for (let windowData of data.windows) {
                let windowObject = this.upsertModel('window', windowData);
                this.insertModels('message', windowData.messages, windowObject);
            }

            this.set('windowListComplete', true);

            Ember.Logger.info('Snapshot processed.');
        } catch (e) {
            Ember.Logger.info(`Failed to load or process snapshot: ${e}`);
        }
    }
});
