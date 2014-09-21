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

Mas.MainController = Ember.ArrayController.extend({
    needs: [ 'application' ],

    friends: null,

    actions: {
        show: function(window) {
            window.set('visible', true);

            if (!window.get('scrollLock')) {
                window.set('newMessagesCount', 0);
            }
        },

        logout: function() {
            Mas.networkMgr.send({ id: 'LOGOUT' }, function() {
                $.removeCookie('ProjectEvergreen', { path: '/' });
                window.location = '/';
            });
        }
    },

    initDone: Ember.computed.alias('controllers.application.initDone'),

    sortedHiddenWindows: function() {
        return this.get('model').filter(function(val) {
            return !val.get('visible');
        }).sortBy('timeHidden');
    }.property('model.@each.visible'),

    friendsOnline: function() {
        return this.get('friends').filterBy('online', true).length;
    }.property('friends.@each.online')
});
