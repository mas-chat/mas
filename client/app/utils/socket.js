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

/* globals $, io */

import Ember from 'ember';
import { calcMsgHistorySize } from '../utils/msg-history-sizer';
import { dispatch, getStore } from 'emflux/dispatcher';

const serverIdToEventMap = {
    ADDMEMBERS: 'ADD_MEMBERS_SERVER',
    ALERT: 'SHOW_ALERT_SERVER',
    CLOSE: 'DELETE_WINDOW_SERVER',
    CREATE: 'ADD_WINDOW_SERVER',
    DELMEMBERS: 'DELETE_MEMBERS_SERVER',
    FRIENDS: 'ADD_FRIENDS_SERVER',
    FRIENDSCONFIRM: 'CONFIRM_FRIENDS_SERVER',
    INITDONE: 'FINISH_STARTUP_SERVER',
    MSG: 'ADD_MESSAGE_SERVER',
    NETWORKS: 'UPDATE_NETWORKS_SERVER',
    SET: 'UPDATE_SETTINGS_SERVER',
    UPDATE: 'UPDATE_WINDOW_SERVER',
    USERS: 'ADD_USERS_SERVER'
};

let ioSocket = io.connect(); // Start connection as early as possible.

let SocketService = Ember.Object.extend({
    sessionId: 0,

    _connected: false,
    _disconnectedQueue: null,
    _disconnectedTimer: null,

    _windowsStore: null,

    init() {
        this._super();
        this._disconnectedQueue = Ember.A([]);
    },

    start() {
        this.set('_windowsStore', getStore('windows'));

        this.set('_windowsStore.initDone', false);
        this._emitInit();

        ioSocket.on('initok', Ember.run.bind(this, function(data) {
            this.set('_connected', true);

            this.set('sessionId', data.sessionId);
            this.set('_windowsStore.maxBacklogMsgs', data.maxBacklogMsgs);

            // TODO: Delete oldest messages for windows that have more messages than
            // maxBacklogMsgs. They can be stale, when editing becomes possible.

            for (let command of this._disconnectedQueue) {
                this._emitReq(command.command, command.callback);
            }

            this._disconnectedQueue.clear();
        }));

        ioSocket.on('terminate', Ember.run.bind(this, function() {
            this._logout();
        }));

        ioSocket.on('ntf', Ember.run.bind(this, function(notification) {
            let type = notification.id;
            delete notification.id;

            if (type !== 'MSG') {
                Ember.Logger.info(`← NTF: ${type}`);
            }

            let event = serverIdToEventMap[type];

            if (event) {
                dispatch(event, notification);
            } else {
                Ember.Logger.warn(`Unknown notification received: ${type}`);
            }
        }));

        ioSocket.on('disconnect', Ember.run.bind(this, function() {
            Ember.Logger.info('Socket.io connection lost.');

            this.set('_connected', false);

            this.set('_disconnectedTimer', Ember.run.later(this, function() {
                dispatch('OPEN_PRIORITY_MODAL', {
                    name: 'non-interactive-modal',
                    model: {
                        title: 'Connection error',
                        body: 'Connection to server lost. Trying to reconnect…'
                    }
                });

                this.set('_disconnectedTimer', null);
            }, 5000));
        }));

        ioSocket.on('reconnect', Ember.run.bind(this, function() {
            let timer = this.get('_disconnectedTimer');

            if (timer) {
                Ember.run.cancel(timer);
            } else {
                dispatch('CLOSE_PRIORITY_MODAL');
            }

            this._emitInit();
        }));
    },

    send(command, callback) {
        if (this.get('_connected')) {
            this._emitReq(command, callback);
        } else {
            Ember.Logger.info(`No Socket.io Connection, buffering: ${command.id}`);

            this._disconnectedQueue.push({
                command: command,
                callback: callback
            });
        }
    },

    _emitInit() {
        let maxBacklogMsgs = calcMsgHistorySize();
        let cachedUpto = this.get('_windowsStore.cachedUpto');
        let userId = this.get('_windowsStore.userId');
        let secret = this.get('_windowsStore.secret');

        ioSocket.emit('init', {
            clientName: 'web',
            clientOS: navigator.platform,
            userId: userId,
            secret: secret,
            version: '1.0',
            maxBacklogMsgs: maxBacklogMsgs,
            cachedUpto: cachedUpto
        });

        Ember.Logger.info(`→ INIT: cachedUpto: ${cachedUpto}, maxBacklogMsgs: ${maxBacklogMsgs}`);
    },

    _emitReq(command, callback) {
        ioSocket.emit('req', command, function(data) {
            if (callback) {
                Ember.Logger.info('← RESP');
                callback(data);
            }
        });

        Ember.Logger.info('→ REQ: ' + command.id);
    },

    _logout() {
        $.removeCookie('auth', { path: '/' });
        window.location = '/';
    }
});

export default SocketService.create();
