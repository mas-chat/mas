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

Mas.Window = Ember.Object.extend({
    init: function() {
        this._super();

        this.messages = Ember.A([]);
        this.operators = Ember.A([]);
        this.voices = Ember.A([]);
        this.users = Ember.A([]);
    },

    windowId: 0,
    name: null,
    userId: null,
    network: null,
    type: null,
    row: null,
    visible: false,
    messages: null,

    newMessagesCount: 0,
    scrollLock: false,
    deletedLine: false,

    operators: null,
    voices: null,
    users: null,

    operatorNames: function() {
        return this._mapUserIdsToNicks('operators');
    }.property('operators.@each', 'Mas.userdb.users.@each.nick'),

    voiceNames: function() {
        return this._mapUserIdsToNicks('voices');
    }.property('voices.@each', 'Mas.userdb.users.@each.nick'),

    userNames: function() {
        return this._mapUserIdsToNicks('users');
    }.property('users.@each', 'Mas.userdb.users.@each.nick'),


    decoratedTitle: function() { // (name, topic)
        var title;
        var name = this.get('name');
        var network = this.get('network');

        if (this.get('type') === '1on1') {
            var conversationNetwork = network === 'MAS' ? '' : network + ' ';
            title = 'Private ' + conversationNetwork + 'conversation with ' +
                Mas.userDb.getNick(this.get('userId'));
        } else if (network === 'MAS') {
            title = 'Group: ' + name.charAt(0).toUpperCase() + name.substr(1);
        } else {
            title = network + ': ' + name;
        }

        return title;
    }.property('name', 'network', 'type', 'Mas.userdb.users.@each.nick'),

    decoratedTopic: function() {
        return this.get('topic') ? '- ' + this.get('topic') : '';
    }.property('topic'),

    simplifiedName: function() {
        var name = this.get('name');
        name = name.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
        return name;
    }.property('name'),

    tooltipTopic: function() {
        var topic = this.get('topic') || '[NOT SET]'
        return 'Topic: ' + topic;
    }.property('topic'),

    explainedType: function() {
        var type = this.get('type');
        var network = this.get('network');

        if (type === 'group') {
            return network === 'MAS' ? 'group' : 'IRC channel';
        } else {
            return network === 'MAS' ? '1 on 1 conversation' : 'IRC 1 on 1 conversation';
        }
    }.property('type'),

    syncServer: function() {
        Mas.networkMgr.send({
            id: 'UPDATE',
            windowId: this.get('windowId'),
            row: this.get('row'),
            visible: this.get('visible')
        });
    }.observes('visible', 'row'),

    _mapUserIdsToNicks: function(role) {
        return this.get(role).map(function(userId) {
            return {
                userId: userId,
                nick: Mas.userDb.getNick(userId)
            };
        });
    }
});
