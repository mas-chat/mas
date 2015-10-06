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

/* globals moment, $ */

import Ember from 'ember';
import Users from '../utils/users';
import Window from '../models/window';
import Friend from '../models/friend';
import Alert from '../models/alert';
import IndexArray from '../utils/index-array';
import BaseStore from './base-store';
import { calcMsgHistorySize } from '../utils/msg-history-sizer';

export default BaseStore.extend({
    action: Ember.inject.service(),
    socket: Ember.inject.service(),

    users: null,
    friends: null,
    windows: null,
    alerts: null,
    networks: null,
    modals: null,

    settings: null,
    profile: null,

    userId: null,
    initDone: false,
    maxBacklogMsgs: 100000,
    cachedUpto: 0,
    dayCounter: 0,

    init() {
        this._super();

        this.set('users', Users.create());
        this.set('networks', Ember.A([]));
        this.set('modals', Ember.A([]));

        this.set('friends', IndexArray.create({ index: 'userId', factory: Friend }));
        this.set('windows', IndexArray.create({ index: 'windowId', factory: Window }));
        this.set('alerts', IndexArray.create({ index: 'alertId', factory: Alert }));

        this.set('settings', Ember.Object.create({
            theme: 'default',
            activeDesktop: null,
            email: '', // TBD: Remove from here, keep in profile
            emailConfirmed: true
        }));

        this.set('profile', Ember.Object.create({
            nick: '',
            name: '',
            email: ''
        }));

        let authCookie = $.cookie('auth') || '';
        let [ userId, secret ] = authCookie.split('-');

        if (!userId || !secret) {
            this.get('action').dispatch('LOGOUT');
        }

        this.set('userId', userId);
        this.set('secret', secret);
    },

    desktops: Ember.computed('windows.@each.desktop', 'windows.@each.newMessagesCount', function() {
        let desktops = {};
        let desktopsArray = Ember.A([]);

        this.get('windows').forEach(function(masWindow) {
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
    }),

    deletedDesktopCheck: Ember.observer('desktops.[]', 'initDone', function() {
        if (!this.get('initDone')) {
            return;
        }

        let desktopIds = this.get('desktops').map(d => d.id);

        if (desktopIds.indexOf(this.get('settings.activeDesktop')) === -1) {
            this.get('action').dispatch('CHANGE_ACTIVE_DESKTOP', {
                desktop: this.get('desktops').map(d => d.id).sort()[0] // Oldest
            });
        }
    }),

    start() {
        let data = this._loadSnapshot();

        // It's now first possible time to start socket.io connection. Data from server
        // can't race with snapshot data as first socket.io event will be processed at
        // earliest in the next runloop.
        this.get('socket').start();

        this._startDayChangedService();
    },

    toJSON() {
        let data = {
            windows: [],
            users: {},
            activeDesktop: this.get('activeDesktop'),
            userId: this.get('userId'),
            version: 1
        };

        let maxBacklogMsgs = calcMsgHistorySize();
        let cachedUpto = 0;

        for (let masWindow of this.get('windows')) {
            let messages = [];

            let sortedMessages = masWindow.get('messages').sortBy('ts').slice(-1 * maxBacklogMsgs);

            for (let message of sortedMessages) {
                let messageData = message.getProperties([
                    'gid',
                    'body',
                    'cat',
                    'ts',
                    'updatedTs',
                    'userId',
                    'status',
                    'type',
                    'hideImages'
                ]);

                if (messageData.gid > cachedUpto) {
                    cachedUpto = messageData.gid;
                }

                if (!messageData.status || messageData.status === 'original') {
                    // Save space
                    delete messageData.status;
                    delete messageData.updatedTs;
                }

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
                'minimizedNamesList',
                'alerts'
            ]);

            windowProperties.messages = messages;
            data.windows.push(windowProperties);
        }

        data.cachedUpto = cachedUpto;

        this.set('cachedUpto', cachedUpto);

        for (let userId of Object.keys(data.users)) {
            data.users[userId] = this.get('users.users.' + userId);
        }

        return data;
    },

    fromJSON(data) {
        for (let userId of Object.keys(data.users)) {
            this.set('users.users.' + userId, data.users[userId]);
        }

        this.get('users').incrementProperty('isDirty');

        for (let windowData of data.windows) {
            let messages = windowData.messages;
            delete windowData.messages;

            let windowObject = this.upsertModel('window', windowData);
            this.insertModels('message', messages, windowObject);
        }

        this.set('activeDesktop', data.activeDesktop);
        this.set('cachedUpto', data.cachedUpto ? data.cachedUpto : 0);
    },

    _startDayChangedService() {
        // Day has changed service
        let timeToTomorrow = moment().endOf('day').diff(moment()) + 1;

        let changeDay = function() {
            this.incrementProperty('dayCounter');
            Ember.run.later(this, changeDay, 1000 * 60 * 60 * 24);
        };

        Ember.run.later(this, changeDay, timeToTomorrow);
    }
});
