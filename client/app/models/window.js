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

'use strict';

import Ember from 'ember';
import TitleBuilder from '../helpers/title-builder';

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

    visible: true,
    messages: null,
    logMessages: null,

    newMessagesCount: 0,

    operators: null,
    voices: null,
    users: null,

    titleAlert: false,
    sounds: false,
    minimizedNamesList: false,

    password: null,

    sortedMessages: Ember.computed('messages.@each', function() {
        return this.get('messages').sortBy('ts');
    }),

    userNickHighlightRegex: Ember.computed('store.userId', 'store.users.isDirty', function() {
        let userId = this.get('store.userId');
        let nick = this.get('store.users').getNick(userId, this.get('network'));

        return new RegExp(`(^|[@ ])${nick}[ :]`);
    }),

    operatorNames: Ember.computed('operators.@each', 'store.users.isDirty', function() {
        return this._mapUserIdsToNicks('operators').sortBy('nick');
    }),

    voiceNames: Ember.computed('voices.@each', 'store.users.isDirty', function() {
        return this._mapUserIdsToNicks('voices').sortBy('nick');
    }),

    userNames: Ember.computed('users.@each', 'store.users.isDirty', function() {
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

    messageLimiter: Ember.observer('messages.@each', function() {
        let sortedMessages = this.get('messages').sortBy('ts');
        let maxBacklogMsgs = this.get('store.maxBacklogMsgs');

        for (let i = 0; i < sortedMessages.length - maxBacklogMsgs; i++) {
            this.get('messages').removeObject(sortedMessages[i]);
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

    syncServerAlerts: Ember.observer('titleAlert', 'sounds', 'minimizedNamesList', function() {
        this.get('socket').send({
            id: 'UPDATE',
            windowId: this.get('windowId'),
            sounds: this.get('sounds'),
            titleAlert: this.get('titleAlert'),
            minimizedNamesList: this.get('minimizedNamesList')
        });
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
