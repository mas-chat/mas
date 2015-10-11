//
//   Copyright 2009-2015 Ilkka Oksanen <iao@iki.fi>
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

import Ember from 'ember';
import BaseStore from '../stores/base-store';
import IndexArray from '../utils/index-array';
import Friend from '../models/friend';
import { dispatch } from '../utils/dispatcher';

export default BaseStore.extend({
    socket: Ember.inject.service(),
    store: Ember.inject.service(),
    friends: null,

    init() {
        this._super();

        this.set('friends', IndexArray.create({ index: 'userId', factory: Friend }));
    },

    _handleAddFriends(data) {
        if (data.reset) {
            this.get('friends').clearModels();
        }

        for (let friend of data.friends) {
            friend.store = this.get('store');
           this.get('friends').upsertModel(friend);
        }
    },

    _handleConfirmRemoveFriend(data) {
        dispatch('OPEN_MODAL', {
            name: 'remove-friend-modal',
            model: data.userId
        });
    },

    _handleRequestFriend(data) {
        this.get('socket').send({
            id: 'REQUEST_FRIEND',
            userId: data.userId
        }, resp => {
            let message = resp.status === 'OK' ?
                'Request sent. Contact will added to your list when he or she approves.' :
                resp.errorMsg;

            dispatch('SHOW_ALERT', {
                alertId: `internal:${Date.now()}`,
                message: message,
                dismissible: true,
                report: false,
                postponeLabel: false,
                ackLabel: 'Okay'
            });
        });
    },

    _handleConfirmFriends(data) {
        let users = this.get('store.users');

        for (let friendCandidate of data.friends) {
            let realName = users.getName(friendCandidate.userId);
            let nick = users.getNick(friendCandidate.userId, 'MAS');
            let userId = friendCandidate.userId;

            dispatch('SHOW_ALERT', {
                alertId: friendCandidate.userId,
                message: `Allow ${realName} (${nick}) to add you to his/her contacts list?`,
                dismissible: true,
                report: false,
                postponeLabel: 'Decide later',
                nackLabel: 'Ignore',
                ackLabel: 'Allow',
                resultCallback: (result) => {
                    if (result === 'ack' || result === 'nack') {
                        this.get('socket').send({
                            id: 'FRIEND_VERDICT',
                            userId: userId,
                            allow: result === 'ack'
                        });
                    }
                }
            });
        };
    },

    _handleRemoveFriend(data) {
        this.get('socket').send({
            id: 'REMOVE_FRIEND',
            userId: data.userId
        });
    }
});
