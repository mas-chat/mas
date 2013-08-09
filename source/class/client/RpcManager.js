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

qx.Class.define('client.RpcManager',
{
    extend : qx.core.Object,

    construct : function() {
        this.base(arguments);

        // Long polling XMLHttpRequest that listens for incoming messages
        this._pollMsgXhr = new qx.io.request.Xhr('/ralph');
        this._pollMsgXhr.setTimeout(35000);
        this._pollMsgXhr.addListener('success', this._pollMsgsSuccess, this);
        this._pollMsgXhr.addListener('fail', this._pollMsgFailure, this);

        // Second XMLHttpRequest for sending messages
        this._sendMsgXhr = new qx.io.request.Xhr('/ralph');
        this._sendMsgXhr.setTimeout(15000);
        this._sendMsgXhr.setMethod('POST');
        this._sendMsgXhr.setRequestHeader('content-type', 'application/json');
        this._sendMsgXhr.addListener('success', this._sendMsgSuccess, this);
        this._sendMsgXhr.addListener('fail', this._sendMsgFailure, this);

        var date = new Date();
        this.timezone = date.getTimezoneOffset();

        // Make initial connection and start polling the server for incoming
        // messages
        this._pollMsgs();
    },

    members : {
        sessionId : 0,
        timezone : 0, // TODO: Public because of call from LogDialog, fix.
        mainscreen : 0,

        _state : false,
        _sendQueue : [],
        _rcvMsgXhr : 0,
        _pollMsgXhr : 0,
        _firstPoll : true,
        _pollSeq : 0,
        _sendSeq : 1,

        call : function(command, params) {
            var message = {};
            message.command = command;
            message.params = params;

            this._sendQueue.push(message);

            client.debug.print(
                'Outgoing message buffered: ' + command + ' (Queue len: ' +
                    this._sendQueue.length + ')');

            if (this._sendQueue.length === 1) {
                this._sendMsg(this._sendQueue[0]);
            }
        },

        _sendMsg : function(message) {
            this._sendMsgXhr.setUrl(
                '/ralph/' + this.sessionId + '/' + this._sendSeq);
            this._sendMsgXhr.setRequestData(JSON.stringify(message));
            this._sendMsgXhr.send();

            client.debug.print('--> MSG: ' + message.command);
        },

        _sendMsgSuccess : function() {
            var resp = this._sendMsgXhr.getResponse();

            if (this._processCommands(resp.commands, true) === false) {
                // Stop prossing the queue
                return;
            }

            this._sendQueue.shift();
            this._sendSeq++;

            if (this._state === 'error') {
                this._state = 'normal';
                this.mainscreen.setStatusText('');
            }

            this._sendMsgFinished();
        },

        _sendMsgFailure : function() {
            var code = this._sendMsgXhr.getStatus();
            this._state = 'error';

            client.debug.print(
                'sendMsg: XHR request failed, code: ' + code);

            this.mainscreen.setStatusText(
                'Connection to MeetAndSpeak server lost, trying to' +
                    'reconnect...');

            this._sendMsgFinished();
        },

        _sendMsgFinished : function() {
            if (this._sendQueue.length > 0) {
                var obj = this._sendQueue[0];
                this._sendMsg(obj);
            }
        },

        _pollMsgs : function() {
            var tz = '';

            if (this._firstPoll === true) {
                tz = '/' + this.timezone;
            }

            this._pollMsgXhr.setUrl(
                '/ralph/' + this.sessionId + '/' + this._pollSeq + tz);
            this._pollMsgXhr.send();

            client.debug.print(
                '--> Polling request sent (seq ' + this._pollSeq + ')');
        },

        _pollMsgsSuccess : function() {
            var resp = this._pollMsgXhr.getResponse();

            this._pollSeq++;

            if (this._firstPoll) {
                this._firstPoll = false;
            }

            client.debug.print('<-- Response to polling request');

            if (this._processCommands(resp.commands, false) === true) {
                this._pollMsgs();
            }
        },

        _processCommands : function(commands, solicited) {
            for (var i = 0; i < commands.length; i++) {
                var command = commands[i];

                var prefix = '<-- MSG: ';
                if (!solicited) {
                    // This is a response to polling request, it can contain
                    // multiple messages
                    prefix = '  |- MSG: ';
                }

                client.debug.print(prefix + command);
                var result = this.mainscreen.handleCommand(command);

                if (result === false) {
                    // Permanent error, bail out without making a new RPC
                    // request
                    return false;
                }
            }

            return true;
        },

        _pollMsgFailure : function() {
            var code = this._pollMsgXhr.getStatus();
            var phase = this._pollMsgXhr.getPhase();

            if (this._firstPoll === true) {
                this.mainscreen.handleRpcError();
            } else if (phase === 'timeout') {
                // Make next request immediately
                this._pollMsgs();
            } else {
                client.debug.print(
                    'pollMsg: XHR request failed, code: ' + code);

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
