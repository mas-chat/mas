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

'use strict';

/* globals $, io, isMobile */

import Ember from 'ember';
import NotificationParser from '../helpers/notification-parser';

export default Ember.Object.extend({
    store: Ember.inject.service(),

    sessionId: 0,
    secret: '',

    _notificationParser: null,
    _connected: false,
    _disconnectedQueue: null,

    _networkErrorStartCallback: null,
    _networkErrorEndCallback: null,
    _networkErrorCallbackCtx: null,

    init() {
        this._super();

        this._disconnectedQueue = Ember.A([]);

        let authCookie = $.cookie('auth');

        if (!authCookie) {
            this._logout();
        }

        let [ userId, secret ] = authCookie.split('-');

        if (!userId || !secret) {
            this._logout();
        }

        this.set('store.userId', userId);
        this.set('secret', secret);

        this._notificationParser = NotificationParser.create({
            socket: this,
            store: this.get('store')
        });

        this._notificationParser.reset();
    },

    start() {
        let userId = this.get('store.userId');
        let secret = this.get('secret');
        let socket = io.connect();

        this.set('socket', socket);
        this._emitInit(userId, secret);

        socket.on('initok', Ember.run.bind(this, function(data) {
            this.set('_connected', true);

            this.set('sessionId', data.sessionId);
            this.set('store.maxBacklogMsgs', data.maxBacklogMsgs);

            for (let command of this._disconnectedQueue) {
                this._emitReq(command.command, command.callback);
            }

            this._disconnectedQueue.clear();
        }));

        this.socket.on('terminate', Ember.run.bind(this, function(data) {
            if (data.code === 'INVALID_SESSION') {
                window.location.reload();
            } else {
                this._logout();
            }
        }));

        socket.on('ntf', Ember.run.bind(this, function(data) {
            this._notificationParser.process(data);
        }));

        socket.on('disconnect', Ember.run.bind(this, function() {
            Ember.Logger.info('Socket.io connection lost.');

            this.set('_connected', false);

            let startCallback = this.get('_networkErrorStartCallback');

            if (startCallback) {
                startCallback.call(this.get('_networkErrorCallbackCtx'));
            }
        }));

        socket.on('reconnect', Ember.run.bind(this, function() {
            let endCallback = this.get('_networkErrorEndCallback');

            if (endCallback) {
                endCallback.call(this.get('_networkErrorCallbackCtx'));
            }

            this._notificationParser.reset();
            this._emitInit(userId, secret);
        }));
    },

    send(command, callback) {
        if (this.get('_connected')) {
            this._emitReq(command, callback);
        } else {
            Ember.Logger.info('Connection lost. Buffering ' + command.id);

            this._disconnectedQueue.push({
                command: command,
                callback: callback
            });
        }
    },

    registerNetworkErrorHandlers(ctx, startCallback, endCallback) {
        this.set('_networkErrorStartCallback', startCallback);
        this.set('_networkErrorEndCallback', endCallback);
        this.set('_networkErrorCallbackCtx', ctx);
    },

    _emitInit(userId, secret) {
        this.socket.emit('init', {
            clientName: 'web',
            clientOS: navigator.platform,
            userId: userId,
            secret: secret,
            version: '1.0',
            maxBacklogMsgs: isMobile.any ? 80 : 160
        });
    },

    _emitReq(command, callback) {
        this.socket.emit('req', command, function(data) {
            if (callback) {
                Ember.Logger.info('← Response to REQ');
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
