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

/* globals $, io */

import Ember from 'ember';
import NotificationParser from './notification-parser';

export default Ember.Object.extend({
    store: Ember.inject.service(),

    sessionId: 0,

    _callbacks: {},
    _notificationParser: null,
    _connectionLost: false,
    _connectionLostWarningVisible: false,
    _disconnectedQueue: null,

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

        this._notificationParser = NotificationParser.create({
            store: this.get('store'),
            container: this.get('container')
        });

        let socket = this.socket = io.connect();

        socket.emit('init', {
            clientName: 'web',
            clientOS: navigator.platform,
            userId: userId,
            secret: secret,
            version: '1.0'
        });

        socket.on('initok', Ember.run.bind(this, function(data) {
            this.set('sessionId', data.sessionId);
        }));

        socket.on('resumeok', Ember.run.bind(this, function() {
            Ember.Logger.info(
                `MAS session resumed. Sending ${this._disconnectedQueue.length} commands`);

            for (let command of this._disconnectedQueue) {
                this._send(command.command, command.callback);
            }

            this._disconnectedQueue.clear();
            this._connectionLost = false;

            if (this._connectionLostWarningVisible) {
                this.get('container').lookup('controller:application').send('closeModal');
            }
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

        socket.on('resp', Ember.run.bind(this, function(command) {
            Ember.Logger.info('← RESP: ' + command.id);

            // Command is a response to command we sent earlier
            if (this._callbacks[command.id]) {
                this._callbacks[command.id](command);
            }
        }));

        socket.on('disconnect', Ember.run.bind(this, function() {
            Ember.Logger.info('Socket.io connection lost.');

            this._connectionLost = true;

            Ember.run.later(this, function() {
                if (this._connectionLost) {
                    this._connectionLostWarningVisible = true;

                    this.get('container').lookup('route:application').send(
                        'openModal', 'non-interactive-modal', {
                            title: 'Connection error',
                            body: 'Connection to server lost. Trying to reconnect…'
                        });
                }
            }, 5000);
        }));

        socket.on('reconnect', Ember.run.bind(this, function() {
            Ember.Logger.info('Socket.io connection resumed.');

            socket.emit('resume', {
                userId: userId,
                sessionId: this.get('sessionId')
            });
        }));
    },

    send(command, callback) {
        if (this._connectionLost) {
            Ember.Logger.info('Connection is lost. Buffering ' + command.id);

            this._disconnectedQueue.push({
                command: command,
                callback: callback
            });
        } else {
            this._send(command, callback);
        }
    },

    _send(command, callback) {
        if (callback) {
            this._callbacks[command.id + '_RESP'] = callback;
        }

        this.socket.emit('req', command);
        Ember.Logger.info('→ REQ: ' + command.id);
    },

    _logout() {
        $.removeCookie('auth', { path: '/' });
        window.location = '/';
    }
});
