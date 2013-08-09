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

    construct : function(id, sec) {
        this.base(arguments);

        this._id = id;
        this._sec = sec;

        // Long polling XMLHttpRequest that listens for incoming messages
        this._pollMsgXhr = new qx.io.request.Xhr('/ralph');
        this._pollMsgXhr.setTimeout(35000);
        this._pollMsgXhr.addListener('success', this._pollMsgSuccess, this);
        this._pollMsgXhr.addListener('fail', this._pollMsgFailure, this);

        // Second XMLHttpRequest for sending messages
        this._sendMsgXhr = new qx.io.request.Xhr('/ralph');
        this._sendMsgXhr.setTimeout(15000);
        this._sendMsgXhr.addListener('success', this._sendMsgSuccess, this);
        this._sendMsgXhr.addListener('fail', this._sendMsgFailure, this);

        var date = new Date();
        this.timezone = date.getTimezoneOffset();

        // Make initial connection and start polling the server for incoming
        // messages
        this._pollMsgs();
    },

    members : {
        cookie : 0,
        timezone : 0, // TODO: Public because of call from LogDialog, fix.
        mainscreen : 0,

        _id : 0,
        _sec : 0,
        _state : false,
        _sendQueue : [],
        _rcvMsgXhr : 0,
        _pollMsgXhr : 0,
        _firstPoll : true,
        _helloseq : 0,
        _sendseq : 1,

        call : function(message) {
            this._sendQueue.push(message);

            client.debug.print(
                'Outgoing msg buffered: ' + message + ', queue len: ' +
                    this._sendQueue.length);

            if (this._sendQueue.length === 1) {
                this._sendMsg(this._sendQueue[0]);
            }
        },

        _sendMsg : function(obj) {
            this._sendMsgXhr.setUrl(
                '/ralph/' + this._id + '/' + this._sec + '/' + this.cookie +
                    '/' + this._sendseq);
            this._sendMsgXhr.setRequestData(obj);
            this._sendMsgXhr.send();

            client.debug.print('--> ' + obj.command + ' MSG');
        },

        _sendMsgSuccess : function(e) {
            var resp = e.getTarget();

            // Response parsed according to the server's
            // response content type, e.g. JSON
            client.debug.print(resp.getResponse());  //REMOVE

            client.debug.print('<-- Result: ' + resp.getResponse());

            this.mainscreen.handleCommand(resp.getResponse());

            this._sendQueue.shift();
            this._sendseq++;

            if (this._state === 'error') {
                this._state = 'normal';
                this.mainscreen.setStatusText('');
            }

            this._sendMsgFinished();
        },

        _sendMsgFailure : function(e) {
            var resp = e.getTarget();
            this._state = 'error';

            client.debug.print(
                'sendMsg: XHR failure, code: ' + resp.code);

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
                tz = this.timezone;
            }

            this._pollMsgXhr.setUrl(
                '/ralph/' + this._id + '/' + this._sec + '/' + this.cookie +
                    '/' + this._sendseq + '/' + tz);
            this._pollMsgXhr.send();

            client.debug.print('--> POLL MSG (seq ' + this._helloseq + ')');
        },

        _pollMsgSuccess : function(e) {
            var resp = e.getTarget();

            this._helloseq++;

            if (this._firstPoll) {
                this._firstPoll = false;
            }

            for (var i = 0; i < resp.data.commands.length; i++) {
                var command = resp.data.commands[i];

                client.debug.print('<-- ' + command + 'MSG');
                var result = this.mainscreen.handleCommand(command);

                if (result === false) {
                    // Permanent error, bail out without making a new RPC
                    // request
                    return;
                }
            }

            this._pollMsgs();
        },

        _pollMsgFailure : function(e) {
            var resp = e.getTarget();

            if (this._firstPoll === true) {
                this.mainscreen.handleRpcError();
            } else {
                if (resp.code === qx.io.remote.Rpc.localError.timeout) {
                    // Make next request immediately
                    this._pollMsgs();
                } else {
                    client.debug.print(
                        'pollMsg: XHR failure, code: ' + resp.code);

                    // Wait a little and try again. This is to make sure
                    // that we don't loop and consume all CPU cycles if
                    // there is no connection.
                    qx.event.Timer.once(function() {
                        this._pollMsgs();
                    }, this, 2000);
                }
            }
        }
    }
});
