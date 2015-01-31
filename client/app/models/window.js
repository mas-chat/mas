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
    init: function() {
        this._super();

        this.messages = Ember.A([]);
        this.operators = Ember.A([]);
        this.voices = Ember.A([]);
        this.users = Ember.A([]);
    },

    socket: Ember.inject.service(),

    windowId: 0,
    name: null,
    userId: null,
    network: null,
    type: null,

    row: 0,
    column: 0,

    visible: false,
    timeHidden: null,
    messages: null,

    newMessagesCount: 0,
    scrollLock: false,
    deletedLine: false,

    operators: null,
    voices: null,
    users: null,

    titleAlert: false,
    sounds: false,

    password: null,

    operatorNames: function() {
        return this._mapUserIdsToNicks('operators');
    }.property('operators.@each', 'store.users.isDirty'),

    voiceNames: function() {
        return this._mapUserIdsToNicks('voices');
    }.property('voices.@each', 'store.users.isDirty'),

    userNames: function() {
        return this._mapUserIdsToNicks('users');
    }.property('users.@each', 'store.users.isDirty'),

    decoratedTitle: function() { // (name, topic)
        let title;
        let windowName = this.get('name');
        let network = this.get('network');

        if (this.get('type') === '1on1' && this.get('userId') === 'iSERVER') {
            title = network + ' Server Messages';
        } else if (this.get('type') === '1on1') {
            let conversationNetwork = network === 'MAS' ? '' : network + ' ';
            title = 'Private ' + conversationNetwork + 'conversation with ' +
                this.get('store.users').getNick(this.get('userId'), this.get('network'));
        } else if (network === 'MAS') {
            title = 'Group: ' + windowName.charAt(0).toUpperCase() + windowName.substr(1);
        } else {
            title = network + ': ' + windowName;
        }

        return title;
    }.property('name', 'network', 'type', 'store.users.isDirty'),

    decoratedTopic: function() {
        return this.get('topic') ? '- ' + this.get('topic') : '';
    }.property('topic'),

    simplifiedName: function() {
        let windowName = this.get('name');
        let type = this.get('type');

        if (type === 'group') {
            windowName = windowName.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
        } else {
            windowName = this.get('store.users').getNick(this.get('userId'), this.get('network'));
        }
        return windowName;
    }.property('name'),

    tooltipTopic: function() {
        let topic = this.get('topic');
        return topic ? 'Topic: ' + topic : 'Topic not set.';
    }.property('topic'),

    explainedType: function() {
        let type = this.get('type');
        let network = this.get('network');

        if (type === 'group') {
            return network === 'MAS' ? 'group' : 'channel';
        } else {
            return '1on1';
        }
    }.property('type'),

    syncServerPosition: function() {
        if (!window.disableUpdate) {
            this.get('socket').send({
                id: 'UPDATE',
                windowId: this.get('windowId'),
                row: this.get('row'),
                column: this.get('column'),
                visible: this.get('visible')
            });
        }
    }.observes('visible', 'row', 'column'),

    syncServerAlerts: function() {
        this.get('socket').send({
            id: 'UPDATE',
            windowId: this.get('windowId'),
            sounds: this.get('sounds'),
            titleAlert: this.get('titleAlert')
        });
    }.observes('titleAlert', 'sounds'),

    _mapUserIdsToNicks: function(role) {
        return this.get(role).map(function(userId) {
            return {
                userId: userId,
                nick: this.get('store.users').getNick(userId, this.get('network'))
            };
        }, this);
    }
});
