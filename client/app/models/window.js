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

/* globals moment, isMobile */

import Ember from 'ember';
import BaseModel from './base';
import Message from './message';
import IndexArray from '../utils/index-array';
import { getStore } from 'emflux/dispatcher';

let mobileDesktop = 1;

export default BaseModel.extend({
    windowId: 0,
    generation: '',
    name: null,
    userId: null,
    network: null,
    type: null,

    row: 0,
    column: 0,

    messages: null,
    didPrepend: false,
    logMessages: null,

    newMessagesCount: 0,
    alerts: null,

    operators: null,
    voices: null,
    users: null,

    minimizedNamesList: false,

    password: null,

    _desktop: null,

    _dayServiceStore: null,
    _windowsStore: null,
    _usersStore: null,

    init() {
        this._super();

        this.set('_dayServiceStore', getStore('day-service'));
        this.set('_windowsStore', getStore('windows'));
        this.set('_usersStore', getStore('users'));

        this.set('_desktop', mobileDesktop++);

        this.set('messages', IndexArray.create({ index: 'gid', factory: Message }));
        this.set('logMessages', IndexArray.create({ index: 'gid', factory: Message }));

        this.set('operators', Ember.A([]));
        this.set('voices', Ember.A([]));
        this.set('users', Ember.A([]));

        this.set('alerts', Ember.Object.create({
            email: false,
            notification: false,
            sound: false,
            title: false
        }));
    },

    desktop: Ember.computed('_desktop', {
        get() {
            return this.get('_desktop');
        },
        set(key, value) {
            if (!isMobile.any) {
                this.set('_desktop',  value);
            }

            return this.get('_desktop');
        }
    }),

    sortedMessages: Ember.computed('messages.[]', '_dayServiceStore.dayCounter', function() {
        let result = this.get('messages').sortBy('ts');

        let addDayDivider = (array, dateString, index) => {
            array.splice(index, 0, Message.create({
                body: dateString,
                cat: 'day-divider',
                gid: 0,
                window: this
            }));
        };

        let dayOfNextMsg = moment().format('dddd, MMMM D');

        for (let i = result.length - 1; i >= 0; i--) {
            let ts = moment.unix(result[i].get('ts'));
            let day = ts.format('dddd, MMMM D');

            if (day !== dayOfNextMsg) {
                addDayDivider(result, dayOfNextMsg, i + 1);
                dayOfNextMsg = day;
            }
        }

        return result;
    }),

    userNickHighlightRegex: Ember.computed('_windowsStore.userId', '_usersStore.isDirty',
        function() {
        let userId = this.get('_windowsStore.userId');
        let nick = this.get('_usersStore.users').getByIndex(userId)
            .get('nick')[this.get('network')];

        return new RegExp(`(^|[@ ])${nick}[ :]`);
    }),

    operatorNames: Ember.computed('operators.[]', '_usersStore.isDirty', function() {
        return this._mapUserIdsToNicks('operators').sortBy('nick');
    }),

    voiceNames: Ember.computed('voices.[]', '_usersStore.isDirty', function() {
        return this._mapUserIdsToNicks('voices').sortBy('nick');
    }),

    userNames: Ember.computed('users.[]', '_usersStore.isDirty', function() {
        return this._mapUserIdsToNicks('users').sortBy('nick');
    }),

    decoratedTitle: Ember.computed('name', 'network', 'type', '_usersStore.isDirty', function() {
        let title;
        let type = this.get('type');
        let userId = this.get('userId');
        let network = this.get('network');
        let name = this.get('name');

        if (type === '1on1' && userId === 'i0') {
            title = `${network} Server Messages`;
        } else if (type === '1on1') {
            let ircNetwork = network === 'MAS' ? '' : `${network} `;
            let peerUser = this.get('_usersStore.users').getByIndex(userId);

            let target = peerUser ? peerUser.get('nick')[network] : 'person';
            title = `Private ${ircNetwork} conversation with ${target}`;
        } else if (network === 'MAS') {
            title = `Group: ${name.charAt(0).toUpperCase()}${name.substr(1)}`;
        } else {
            title = `${network}: ${name}`;
        }

        return title;
    }),

    decoratedTopic: Ember.computed('topic', function() {
        return this.get('topic') ? '- ' + this.get('topic') : '';
    }),

    simplifiedName: Ember.computed('name', function() {
        let windowName = this.get('name');
        let network = this.get('network');
        let type = this.get('type');

        if (type === 'group') {
            if (network === 'Flowdock') {
                windowName = windowName.replace(/.+\//, ''); // Remove organization prefix
            }

            windowName = windowName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
        } else {
            let userId = this.get('userId');
            let peerUser = this.get('_usersStore.users').getByIndex(userId);

            windowName = peerUser ? peerUser.get('nick')[network] : '1on1';
        }
        return windowName;
    }),

    tooltipTopic: Ember.computed('topic', function() {
        let topic = this.get('topic');
        return topic ? 'Topic: ' + topic : 'Topic not set.';
    }),

    explainedType: Ember.computed('type', function() {
        let type = this.get('type');
        let network = this.get('network');

        if (type === 'group') {
            return network === 'MAS' ? 'group' : 'channel';
        } else {
            return '1on1';
        }
    }),

    _mapUserIdsToNicks(role) {
        return this.get(role).map(userId => {
            let user = this.get('_usersStore.users').getByIndex(userId);

            return {
                userId: userId,
                nick: user.get('nick')[this.get('network')],
                gravatar: user.get('gravatar')
            };
        });
    }
});
