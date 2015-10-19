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

import Store from 'emflux/store';
import { dispatch, getStore } from 'emflux/dispatcher';
import Friend from '../models/friend';
import IndexArray from '../utils/index-array';
import socket from '../utils/socket';

export default Store.extend({
    friends: IndexArray.create({ index: 'userId', factory: Friend }),

    handleAddFriendsServer(data) {
        if (data.reset) {
            this.get('friends').clearModels();
        }

        this.get('friends').upsertModels(data.friends);
    },

    handleConfirmRemoveFriend(data) {
        dispatch('OPEN_MODAL', {
            name: 'remove-friend-modal',
            model: data.userId
        });
    },

    handleRequestFriend(data) {
        socket.send({
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

    handleConfirmFriendsServer(data) {
        let users = getStore('users').get('users');

        for (let friendCandidate of data.friends) {
            let userId = friendCandidate.userId;
            let user = users.getByIndex(userId);
            let nick = user.get('nick')['MAS'];

            let message = `Allow ${user.get('name')} (${nick}) to add you to his/her contacts list?`

            dispatch('SHOW_ALERT', {
                alertId: friendCandidate.userId,
                message: message,
                dismissible: true,
                report: false,
                postponeLabel: 'Decide later',
                nackLabel: 'Ignore',
                ackLabel: 'Allow',
                resultCallback: (result) => {
                    if (result === 'ack' || result === 'nack') {
                        socket.send({
                            id: 'FRIEND_VERDICT',
                            userId: userId,
                            allow: result === 'ack'
                        });
                    }
                }
            });
        }
    },

    handleRemoveFriend(data) {
        socket.send({
            id: 'REMOVE_FRIEND',
            userId: data.userId
        });
    }
});
