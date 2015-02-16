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
import TitleBuilder from '../helpers/title-builder';

let titleBuilder = TitleBuilder.create();

export default Ember.View.extend({
    classNames: [ 'flex-column', 'fullscreen', 'modal' ],

    socket: Ember.inject.service(),
    store: Ember.inject.service(),

    $dateInput: null,
    conversations: null,
    selectedConversation: null,
    data: 'JEEE',

    selectedConversationLabel: function() {
        if (!this.get('conversations')) {
            return 'No conversations.';
        }

        let selected = 0;

        this.get('conversations').some(function(elem, index) {
            if (elem.conversationId === parseInt(this.get('selectedConversation'))) {
                selected = index;
                return true;
            }
        }.bind(this));

        return this.get('conversations')[selected].label;
    }.property('selectedConversation', 'conversations.@each'),

    actions: {
        nextDay: function() {
            this._seek(1);
        },

        previousDay: function() {
            this._seek(-1);
        }
    },

    init: function() {
        this._super();

        this.conversationLabels = Ember.A([ 'Loading…' ]);
    },

    didInsertElement: function() {
        this._fetchConversations();

        this.$dateInput = this.$('.logs-date');

        this.$dateInput.datepicker({
            autoclose: true,
            todayHighlight: true,
            weekStart: 1
        });

        this.$dateInput.datepicker().on('changeDate', function() {
            this._fetchData();
        }.bind(this));

        this.$dateInput.datepicker('update', new Date());
    },

    _seek: function(days) {
        let currentDate = this.$dateInput.datepicker('getDate');
        this.$dateInput.datepicker('update', moment(currentDate).add(days, 'd').toDate());
        this._fetchData();
    },

    _fetchData: function() {
        let epochTs = moment(this.$dateInput.datepicker('getDate')).unix();
        let daysSinceEpoch = Math.floor(epochTs / 3600 / 24);

        // TBD
        daysSinceEpoch = daysSinceEpoch;
    },

    _fetchConversations: function() {
        this.get('socket').send({
            id: 'LIST_CONVERSATIONS'
        }, function(resp) {
            this.set('conversations', resp.conversations.map(function(elem) {
                return {
                    conversationId: elem.conversationId,
                    label: titleBuilder.build({
                        name: elem.name,
                        network: elem.network,
                        type: elem.type,
                        userId: elem.userId,
                        store: this.get('store')
                    })
                };
            }.bind(this)));

            this.set('selectedConversation', resp.conversations[0].conversationId);
        }.bind(this));
    }
});
