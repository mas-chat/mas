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
import commandParser from './commandParser';

export default Ember.Object.extend({
    sessionId: 0,

    _pollSeq: 0,
    _sendSeq: 0,
    _sendQueue: [],
    _callbacks: {},
    _firstPoll: true,
    _unsolicitedParser: null,
    _state: 'normal',

    init: function() {
        this._super();
        this._pollMsgs();
        this._unsolicitedParser = commandParser.create();
    },

    send: function(command, callback) {
        this._sendQueue.push(command);

        if (callback) {
            this._callbacks[command.id + '_RESP'] = callback;
        }

        Ember.Logger.info('Outgoing command buffered: ' + command.id + ' (Queue len: ' +
            this._sendQueue.length + ')');

        if (this._sendQueue.length === 1) {
            this._sendMsg(this._sendQueue[0]);
        }
    },

    _sendMsg: function(message) {
        var data = {
            sessionId: this.sessionId,
            seq: this._sendSeq,
            command: message
        };

        $.ajax({
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            url: ':3200/api/v1/send',
            data: JSON.stringify(data),
            success: this._sendMsgSuccess,
            error: this._sendMsgFailure,
            context: this,
            timeout: 10000
        });

        Ember.Logger.info('--> MSG: ' + message.id);
    },

    _sendMsgSuccess: function() {
        this._sendQueue.shift();
        this._sendSeq++;

        if (this._state === 'error') {
            this._state = 'normal';
            // this._.setStatusTextCb.call(this._cbCtx, '');
        }

        this._sendMsgFinished();
    },

    _sendMsgFailure: function(jqXHR) {
        var code = jqXHR.status;
        this._state = 'error';

        Ember.Logger.error('sendMsg: XHR request failed, code: ' + code);

        if (code === 401 || code === 406) {
            this._logout();
        } else {
            // TBD: Add notification: 'Connection to MAS server lost, trying to reconnect...'

            // Stay optimistic and keep trying
            setTimeout(function() {
                this._sendMsgFinished();
            }.bind(this), 2000);
        }
    },

    _sendMsgFinished: function() {
        if (this._sendQueue.length > 0) {
            var message = this._sendQueue[0];
            this._sendMsg(message);
        }
    },

    _pollMsgs: function() {
        var data = { seq: this._pollSeq };

        if (this._firstPoll) {
            data.clientName = 'webclient';
            data.clientOS = navigator.platform;
        } else {
            data.sessionId = this.sessionId;
        }

        $.ajax({
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            url: 'http://localhost:3200/api/v1/listen',
            data: JSON.stringify(data),
            success: this._pollMsgsSuccess,
            error: this._pollMsgsFailure,
            context: this,
            timeout: 35000
        });

        Ember.Logger.info('--> Polling request sent (seq ' + this._pollSeq + ')');
    },

    _pollMsgsSuccess: function(data) {
        this._pollSeq++;

        if (this._firstPoll) {
            this._firstPoll = false;
        }

        this._processCommands(data);
        this._pollMsgs();
    },

    _processCommands: function(commands) {
        for (var i = 0; i < commands.length; i++) {
            var command = commands[i];
            Ember.Logger.info('<-- MSG: ' + JSON.stringify(command));

            if (this._callbacks[command.id]) {
                // Command is a response to command we sent earlier
                this._callbacks[command.id](command);
            } else if (command.id === 'SESSIONID') {
                // Special unsolicited command that can be handle directly here
                this.sessionId = command.sessionId;
            } else {
                // Other Unsolicited command
                this._unsolicitedParser.process(command);
            }
        }
    },

    _pollMsgsFailure: function(jqXHR, textStatus, error ) {
        var code = jqXHR.status;

        if (code === 401 || code === 406) {
            this._logout();
        }

        var err = textStatus + ', ' + error;
        Ember.Logger.warn('Request Failed: ' + err );

        // Stay positive, keep trying
        setTimeout(function() {
            this._pollMsgs();
        }.bind(this), 2000);
    },

    _logout: function() {
        $.removeCookie('auth', { path: '/' });
        window.location = '/';
    }
});
