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

/* globals titlenotifier, moment */

import Ember from 'ember';
import { play } from '../helpers/sound';
import UploadMixin from '../mixins/upload';

export default Ember.Controller.extend(UploadMixin, {
    userId: null,

    socket: Ember.inject.service(),

    // TBD: Only routes should access store. But as this controller is instantiated through
    // {{render}}, there's no way to add extra data in addition to model. Component based
    // architecture should fix this.
    store: Ember.inject.service(),

    actions: {
        hide() {
            this.set('model.visible', false);
            this.set('model.timeHidden', Date.now());
        },

        close() {
            this.get('socket').send({
                id: 'CLOSE',
                windowId: this.get('model.windowId')
            });
        },

        browse() {
            this.set('logModeEnabled', true);
        },

        toggleMemberListWidth() {
            this.toggleProperty('wideMemberList');
        },

        sendMessage() {
            let text = this.get('newMessage');
            let messageRecord = this.get('container').lookup('model:message');
            let isCommand = text.charAt(0) === '/';
            let ircServer1on1 = this.get('model.type') === '1on1' &&
                this.get('model.userId') === 'iSERVER';

            this.set('newMessage', '');

            if (ircServer1on1 && !isCommand) {
                messageRecord.setProperties({
                    body: 'Only commands allowed, e.g. /whois john',
                    cat: 'error',
                    ts: moment().unix(),
                    window: this
                });
            } else {
                this.get('socket').send({
                    id: 'SEND',
                    text: text,
                    windowId: this.get('model.windowId')
                });

                messageRecord.setProperties({
                    body: text,
                    cat: 'mymsg',
                    userId: this.get('store.userId'),
                    ts: moment().unix(),
                    window: this.get('model')
                });
            }

            if (!isCommand) {
                this.get('model.messages').pushObject(messageRecord);
            }
        },

        chat(userId) {
            this.get('socket').send({
                id: 'CHAT',
                windowId: this.get('model.windowId'),
                userId: userId
            }, function(resp) {
                if (resp.status !== 'OK') {
                    this.send('openModal', 'info-modal', { title: 'Error', body: resp.errorMsg });
                }
            }.bind(this));
        },

        whois(userId) {
            this.get('socket').send({
                id: 'WHOIS',
                windowId: this.get('model.windowId'),
                userId: userId
            });
        },

        op(userId) {
            this.get('socket').send({
                id: 'OP',
                windowId: this.get('model.windowId'),
                userId: userId
            });
        },

        requestFriend(nick) {
            nick = nick;
        },

        kick(userId) {
            this.get('socket').send({
                id: 'KICK',
                windowId: this.get('model.windowId'),
                userId: userId
            });
        },

        kickban(userId) {
            this.get('socket').send({
                id: 'KICKBAN',
                windowId: this.get('model.windowId'),
                userId: userId
            });
        },

        scrollUp() {
            if (!this.get('model.deletedLine')) {
                this.set('model.scrollLock', true);
                Ember.Logger.info('scrollock on');
            }
        },

        scrollBottom() {
            this.set('model.scrollLock', false);
            this.set('model.newMessagesCount', 0);
            Ember.Logger.info('scrollock off');
        }
    },

    logModeEnabled: false,
    wideMemberList: true,

    newMessageReceived: function() {
        if (!this.get('model.visible') || this.get('model.scrollLock')) {
            this.incrementProperty('model.newMessagesCount');
        }

        if (document.hidden) {
            // Browser title notification
            if (this.get('model.titleAlert')) {
                titlenotifier.add();
            }

            // Sound notification
            if (this.get('model.sounds')) {
                play();
            }
        }
    }.observes('model.messages.@each'),

    isGroup: function() {
        return this.get('model.type') === 'group';
    }.property('model.type'),

    cssType: function() {
        if (this.get('model.type') === 'group') {
            return 'group';
        } else if (this.get('model.userId') === 'iSERVER') {
            return 'server-1on1';
        } else {
            return 'private-1on1';
        }
    }.property('model.type')
});
