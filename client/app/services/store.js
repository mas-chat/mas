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
import Users from '../helpers/users';
import Window from '../models/window';
import Message from '../models/message';
import Friend from '../models/friend';

export default Ember.Service.extend({
    socket: Ember.inject.service(),

    friends: null,
    users: null,

    windows: null,
    activeDesktop: null,

    alerts: null,
    networks: null,

    userId: null,
    initDone: false,

    init() {
        this._super();

        this.set('users', Users.create());
        this.set('friends', Ember.A([]));
        this.set('windows', Ember.A([]));
        this.set('alerts', Ember.A([]));
        this.set('networks', Ember.A([]));
    },

    createObject(type, data) {
        const mapping = {
            window: Window,
            message: Message,
            friend: Friend
        };

        let object = mapping[type].create(data);
        object.set('store', this);

        if (type === 'window') {
            object.set('socket', this.get('socket'));
        }

        return object;
    }
});
