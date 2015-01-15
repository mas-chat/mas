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

export default Ember.Controller.extend({
    modalTopic: null,

    actions: {
        changeTopic: function() {
            // User has clicked 'OK', send the new topic to server
            var newTopic = this.get('modalTopic');

            this.remote.send({
                id: 'UPDATE_TOPIC',
                windowId: this.get('windowId'),
                topic: newTopic
            });

            this.send('closeModal');
        },

        cancel: function() {
            this.set('modalTopic', this.get('topic'));
            this.send('closeModal');
        }
    },

    topicTitle: function() {
        return 'Edit topic for \'' + this.get('name') + '\'';
    }.property('name'),

    topicDidChange: function() {
        this.set('modalTopic', this.get('topic'));
    }.observes('topic').on('init')
});
