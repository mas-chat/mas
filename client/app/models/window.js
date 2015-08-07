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

/* globals isMobile, moment */

import Ember from 'ember';
import TitleBuilder from '../utils/title-builder';
import Message from './message';

let titleBuilder = TitleBuilder.create();

export default Ember.Object.extend({
    init() {
        this._super();

        this.set('messages', Ember.A([]));
        this.set('logMessages', Ember.A([]));

        this.set('operators', Ember.A([]));
        this.set('voices', Ember.A([]));
        this.set('users', Ember.A([]));
    },

    socket: null,
    store: null,

    windowId: 0,
    generation: '',
    name: null,
    userId: null,
    network: null,
    type: null,

    row: 0,
    column: 0,
    desktop: 0,

    messages: null,
    logMessages: null,

    newMessagesCount: 0,

    operators: null,
    voices: null,
    users: null,

    titleAlert: false,
    emailAlert: false,
    soundAlert: false,

    minimizedNamesList: false,

    password: null,

    sortedMessages: Ember.computed('messages.[]', 'store.dayCounter', function() {
        let result = this.get('messages').sortBy('ts');

        let addDayDivider = (array, dateString, index) => {
            array.splice(index, 0, Message.create({
                body: dateString,
                cat: 'day-divider',
                gid: dateString, // String, non-changing and unique, good enough as primary key
                window: this,
                store: this.get('store')
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

        addDayDivider(result, dayOfNextMsg, 0); // Always start the backlog with a day divider

        return result;
    }),

    userNickHighlightRegex: Ember.computed('store.userId', 'store.users.isDirty', function() {
        let userId = this.get('store.userId');
        let nick = this.get('store.users').getNick(userId, this.get('network'));

        return new RegExp(`(^|[@ ])${nick}[ :]`);
    }),

    operatorNames: Ember.computed('operators.[]', 'store.users.isDirty', function() {
        return this._mapUserIdsToNicks('operators').sortBy('nick');
    }),

    voiceNames: Ember.computed('voices.[]', 'store.users.isDirty', function() {
        return this._mapUserIdsToNicks('voices').sortBy('nick');
    }),

    userNames: Ember.computed('users.[]', 'store.users.isDirty', function() {
        return this._mapUserIdsToNicks('users').sortBy('nick');
    }),

    decoratedTitle: Ember.computed('name', 'network', 'type', 'store.users.isDirty', function() {
        return titleBuilder.build({
            name: this.get('name'),
            network: this.get('network'),
            type: this.get('type'),
            userId: this.get('userId'),
            store: this.get('store')
        });
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
            windowName = this.get('store.users').getNick(this.get('userId'), this.get('network'));
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

    messageLimiter: Ember.observer('messages.[]', function() {
        if (!this.get('store.initDone')) {
            return; // There's lot of going on in startup, limiting can wait.
        }

        let maxBacklogMsgs = this.get('store.maxBacklogMsgs');
        let messages = this.get('messages');

        if (messages.length > maxBacklogMsgs) {
            let sortedMessages = messages.sortBy('ts');

            for (let i = 0; i < sortedMessages.length - maxBacklogMsgs; i++) {
               this.get('store').removeModel('message', sortedMessages[i], this);
           }
       }
    }),

    syncServerPosition: Ember.observer('desktop', 'row', 'column', function() {
        if (!window.disableUpdate && !isMobile.any) {
            this.get('socket').send({
                id: 'UPDATE',
                windowId: this.get('windowId'),
                row: this.get('row'),
                column: this.get('column'),
                desktop: this.get('desktop')
            });
        }
    }),

    syncServerAlerts: Ember.observer(
        'emailAlert', 'titleAlert', 'soundAlert', 'minimizedNamesList', function() {
        if (!window.disableUpdate) {
            this.get('socket').send({
                id: 'UPDATE',
                windowId: this.get('windowId'),
                minimizedNamesList: this.get('minimizedNamesList'),
                soundAlert: this.get('soundAlert'),
                emailAlert: this.get('emailAlert'),
                titleAlert: this.get('titleAlert')
            });
        }
    }),

    _mapUserIdsToNicks(role) {
        return this.get(role).map(function(userId) {
            let users = this.get('store.users');

            return {
                userId: userId,
                nick: users.getNick(userId, this.get('network')),
                gravatar: users.getAvatarHash(userId)
            };
        }, this);
    }
});
