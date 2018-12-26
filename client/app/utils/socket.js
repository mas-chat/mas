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

import { bind, later, cancel } from '@ember/runloop';
import { A } from '@ember/array';
import EmberObject from '@ember/object';
import io from 'socket.io-client';
import Cookies from 'js-cookie';
import { calcMsgHistorySize } from './msg-history-sizer';
import { dispatch } from './dispatcher';

const serverIdToEventMap = {
  UPDATE_MEMBERS: 'ADD_MEMBERS_SERVER',
  ADD_ALERT: 'SHOW_ALERT_SERVER',
  DELETE_WINDOW: 'DELETE_WINDOW_SERVER',
  ADD_WINDOW: 'ADD_WINDOW_SERVER',
  DELETE_MEMBERS: 'DELETE_MEMBERS_SERVER',
  UPDATE_FRIENDS: 'ADD_FRIENDS_SERVER',
  CONFIRM_FRIENDS: 'CONFIRM_FRIENDS_SERVER',
  FINISH_INIT: 'FINISH_STARTUP_SERVER',
  ADD_MESSAGE: 'ADD_MESSAGE_SERVER',
  ADD_MESSAGES: 'ADD_MESSAGES_SERVER',
  UPDATE_NETWORKS: 'UPDATE_NETWORKS_SERVER',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS_SERVER',
  UPDATE_WINDOW: 'UPDATE_WINDOW_SERVER',
  ADD_USERS: 'ADD_USERS_SERVER'
};

const ioSocket = io.connect(); // Start connection as early as possible.

const SocketService = EmberObject.extend({
  sessionId: 0,
  cookie: null,

  _connected: false,
  _sendQueue: null,
  _disconnectedTimer: null,

  _windowsStore: null,

  init() {
    this._super();

    this.cookie = Cookies.get('mas') || '';
    this._sendQueue = A([]);

    if (!this.cookie) {
      console.error(`Session cookie not found or corrupted. Exiting.`);
      this._logout();
    }
  },

  start() {
    this.set('_windowsStore', window.stores.windows);

    this.set('_windowsStore.initDone', false);
    this._emitInit();

    ioSocket.on(
      'initok',
      bind(this, function(data) {
        this.set('_connected', true);

        this.set('sessionId', data.sessionId); // TODO: Should not needed, use cookie always

        this.set('_windowsStore.userId', `m${data.userId}`);
        this.set('_windowsStore.maxBacklogMsgs', data.maxBacklogMsgs);

        // TODO: Delete oldest messages for windows that have more messages than
        // maxBacklogMsgs. They can be stale, when editing becomes possible.

        this._emitReq(); // In case there are items in sendQueue from previous session
      })
    );

    ioSocket.on(
      'terminate',
      bind(this, function() {
        this._logout();
      })
    );

    ioSocket.on(
      'refresh_session',
      bind(this, function(data) {
        this.set('cookie', data.refreshCookie);
        Cookies.set('mas', data.refreshCookie, { expires: 7 });
        ioSocket.emit('refresh_done');
      })
    );

    ioSocket.on(
      'ntf',
      bind(this, notification => {
        const type = notification.type;
        delete notification.type;

        if (type !== 'ADD_MESSAGE') {
          console.log(`← NTF: ${type}`);
        }

        const event = serverIdToEventMap[type];

        if (event) {
          dispatch(event, notification);
        } else {
          console.warn(`Unknown notification received: ${type}`);
        }
      })
    );

    ioSocket.on(
      'disconnect',
      bind(this, function() {
        console.log('Socket.io connection lost.');

        this.set('_connected', false);

        this.set(
          '_disconnectedTimer',
          later(
            this,
            function() {
              dispatch('OPEN_PRIORITY_MODAL', {
                name: 'non-interactive-modal',
                model: {
                  title: 'Connection error',
                  body: 'Connection to server lost. Trying to reconnect…'
                }
              });

              this.set('_disconnectedTimer', null);
            },
            5000
          )
        );
      })
    );

    ioSocket.on(
      'reconnect',
      bind(this, function() {
        const timer = this._disconnectedTimer;

        if (timer) {
          cancel(timer);
        } else {
          dispatch('CLOSE_PRIORITY_MODAL');
        }

        this._emitInit();
      })
    );
  },

  send(command, callback) {
    this._sendQueue.push({
      request: command,
      callback
    });

    if (this._sendQueue.length === 1 && this._connected) {
      this._emitReq();
    }
  },

  _emitInit() {
    const maxBacklogMsgs = calcMsgHistorySize();
    const cachedUpto = this.get('_windowsStore.cachedUpto');
    const cookie = this.cookie;

    ioSocket.emit('init', {
      clientName: 'web',
      clientOS: navigator.platform,
      cookie,
      version: '1.0',
      maxBacklogMsgs,
      cachedUpto
    });

    console.log(`→ INIT: cachedUpto: ${cachedUpto}, maxBacklogMsgs: ${maxBacklogMsgs}`);
  },

  _emitReq() {
    if (this._sendQueue.length === 0) {
      return;
    }

    const req = this._sendQueue[0];

    ioSocket.emit('req', req.request, data => {
      if (req.callback) {
        console.log('← RESP');
        req.callback(data);
      }

      this._sendQueue.shift();
      this._emitReq();
    });

    console.log(`→ REQ: ${req.request.id}`);
  },

  _logout() {
    Cookies.remove('mas', { path: '/' });
    window.location = '/';
  }
});

export default SocketService.create();
