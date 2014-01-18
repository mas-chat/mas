//
//   Copyright 2009-2013 Ilkka Oksanen <iao@iki.fi>
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

qx.Class.define('mas.XHR', {
    extend : qx.core.Object,

    construct: function(ctx, processMessageCb, handleErrorCb, handleRpcErrorCb,
                        setStatusTextCb) {
        this.base(arguments);

        // Set the callbacks
        this._processMessageCb = processMessageCb;
        this._handleErrorCb = handleErrorCb;
        this._handleRpcErrorCb = handleRpcErrorCb;
        this._setStatusTextCb = setStatusTextCb;
        this._cbCtx = ctx;

        // Long polling XMLHttpRequest that listens for incoming messages
        this._pollMsgXhr = new qx.io.request.Xhr();
        this._pollMsgXhr.setTimeout(35000);
        this._pollMsgXhr.addListener('success', this._pollMsgsSuccess, this);
        this._pollMsgXhr.addListener('fail', this._pollMsgFailure, this);

        // Second XMLHttpRequest for sending messages
        this._sendMsgXhr = new qx.io.request.Xhr();
        this._sendMsgXhr.setTimeout(15000);
        this._sendMsgXhr.setMethod('POST');
        this._sendMsgXhr.setRequestHeader('content-type', 'application/json');
        this._sendMsgXhr.addListener('success', this._sendMsgSuccess, this);
        this._sendMsgXhr.addListener('fail', this._sendMsgFailure, this);

        // Make initial connection and start polling the server for incoming
        // messages
        this._pollMsgs();
    },

    members: {
        _processMessageCb: null,
        _handleErrorCb: null,
        _handleRpcErrorCb: null,
        _setStatusTextCb: null,
        _cbCtx: null,

        _sessionId: 0,
        _state: false,
        _sendQueue: [],
        _rcvMsgXhr: 0,
        _pollMsgXhr: 0,
        _firstPoll: true,
        _pollSeq: 0,
        _sendSeq: 1,

        call: function(command, params) {
            var message = {};
            message.command = command;
            message.params = params;

            this._sendQueue.push(message);

            debug.print(
                'Outgoing message buffered: ' + command + ' (Queue len: ' +
                    this._sendQueue.length + ')');

            if (this._sendQueue.length === 1) {
                this._sendMsg(this._sendQueue[0]);
            }
        },

        _sendMsg: function(message) {
            this._sendMsgXhr.setUrl(
                '/api/send/' + this._sessionId + '/' + this._sendSeq);
            this._sendMsgXhr.setRequestData(JSON.stringify(message));
            this._sendMsgXhr.send();

            debug.print('--> MSG: ' + message.command);
        },

        _sendMsgSuccess: function() {
            var resp = this._sendMsgXhr.getResponse();

            if (resp.status !== 'OK') {
                this._handleErrorCb.call(this._cbCtx, resp.status);
                // Stop prossessing the queue
                return;
            } else {
                this._processMessages(resp.commands, true);
            }

            this._sendQueue.shift();
            this._sendSeq++;

            if (this._state === 'error') {
                this._state = 'normal';
                this._.setStatusTextCb.call(this._cbCtx, '');
            }

            this._sendMsgFinished();
        },

        _sendMsgFailure: function() {
            var code = this._sendMsgXhr.getStatus();
            this._state = 'error';

            debug.print('sendMsg: XHR request failed, code: ' + code);

            this._setStatusTextCb.call(
                this._cbCtx, 'Connection to MeetAndSpeak server lost,' +
                    'trying to reconnect...');

            // Stay optimistic and keep trying
            qx.event.Timer.once(function() {
                this._sendMsgFinished();
            }, this, 2000);
        },

        _sendMsgFinished: function() {
            if (this._sendQueue.length > 0) {
                var obj = this._sendQueue[0];
                this._sendMsg(obj);
            }
        },

        _pollMsgs: function() {
            var tz = '';

            if (this._firstPoll === true) {
                var date = new Date();
                tz = '/' + date.getTimezoneOffset();
            }

            this._pollMsgXhr.setUrl(
                '/api/listen/' + this._sessionId + '/' + this._pollSeq + tz);
            this._pollMsgXhr.send();

            debug.print('--> Polling request sent (seq ' + this._pollSeq + ')');
        },

        _pollMsgsSuccess: function() {
            var resp = this._pollMsgXhr.getResponse();

            this._pollSeq++;

            if (this._firstPoll) {
                this._firstPoll = false;
            }

            debug.print('<-- Response to polling request');

            if (resp.status !== 'OK') {
                this._handleErrorCb(resp.status);
            } else {
                this._processMessages(resp.commands, false);
                this._pollMsgs();
            }
        },

        _processMessages: function(messages, solicited) {
            for (var i = 0; i < messages.length; i++) {
                var message = messages[i];

                var prefix = '<-- MSG: ';
                if (!solicited) {
                    // This is a response to polling request, it can contain
                    // multiple messages
                    prefix = '  |- MSG: ';
                }

                debug.print(prefix + JSON.stringify(message));

                if (message.id === 'SESSIONID') {
                    this._sessionId = message.sessionId;
                } else {
                    var result = this._processMessageCb.call(
                        this._cbCtx, message);

                    if (result === false) {
                        // Permanent error, bail out without making a new RPC
                        // request
                        return false;
                    }
                }
            }

            return true;
        },

        _pollMsgFailure: function() {
            var code = this._pollMsgXhr.getStatus();
            var phase = this._pollMsgXhr.getPhase();

            if (this._firstPoll === true) {
                this._handleRpcErrorCb.call(this._cbCtx);
            } else if (phase === 'timeout') {
                // Make next request immediately
                this._pollMsgs();
            } else {
                debug.print('pollMsg: XHR request failed, code: ' + code);

                // Wait a little and try again. This is to make sure
                // that we don't loop and consume all CPU cycles if
                // there is no connection.
                qx.event.Timer.once(function() {
                    this._pollMsgs();
                }, this, 2000);
            }
        }
    }
});
