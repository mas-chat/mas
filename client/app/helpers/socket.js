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
    sessionId: 0,

    _callbacks: {},
    _notificationParser: null,

    init: function() {
        this._super();

        let authCookie = $.cookie('auth');

        if (!authCookie) {
            this._logout();
        }

        let params = authCookie.split('-');
        let userId = params[0];
        let secret = params[1];

        this.set('store.userId', userId);

        if (!userId || !secret) {
            this._logout();
        }

        this._notificationParser = NotificationParser.create({
            store: this.get('store'),
            container: this.get('container')
        });

        this.socket = io.connect();

        this.socket.emit('init', {
            clientName: 'web',
            clientOS: navigator.platform,
            userId: userId,
            secret: secret,
            version: '1.0'
        });

        this.socket.on('initok', Ember.run.bind(this, function(data) {
            this.set('sessionId', data.sessionId);
        }));

        this.socket.on('terminate', Ember.run.bind(this, function(data) {
            if (data.code === 'INVALID_SESSION') {
                window.location.reload();
            } else {
                this._logout();
            }
        }));

        this.socket.on('ntf', Ember.run.bind(this, function(data) {
            this._notificationParser.process(data);
        }));

        this.socket.on('resp', Ember.run.bind(this, function(command) {
            // Command is a response to command we sent earlier
            if (this._callbacks[command.id]) {
                this._callbacks[command.id](command);
            }
        }));

        this.socket.on('disconnect', Ember.run.bind(this, function() {
            this.get('container').lookup('route:application').send(
                'openModal', 'non-interactive-modal', {
                    title: 'Connection error',
                    body: 'Connection to server lost. Trying to reconnect…'
                });
        }));

        this.socket.on('reconnect', Ember.run.bind(this, function() {
            this.socket.emit('resume', {
                userId: userId,
                sessionId: this.get('sessionId')
            });

            this.get('container').lookup('route:application').send(
                'closeModal');
        }));
    },

    send: function(command, callback) {
        if (callback) {
            this._callbacks[command.id + '_RESP'] = callback;
        }

        this.socket.emit('req', command);

        Ember.Logger.info('--> REQ: ' + command.id);
    },

    _logout: function() {
        $.removeCookie('auth', { path: '/' });
        window.location = '/';
    }
});
