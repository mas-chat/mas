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

require('./commandParser');

App.Network = Ember.Object.extend({
    _sessionId: 0,
    _pollSeq: 0,
    _sendSeq: 0,
    _firstPoll: true,
    _parser: null,

    init: function() {
        this._pollMsgs();
        this._parser = App.CommandParser.create();
    },

    _pollMsgs: function() {
        var tz = '';

        if (this._firstPoll) {
            var date = new Date();
            tz = '/' + date.getTimezoneOffset();
        }

        Ember.Logger.info('--> Polling request sent (seq ' + this._pollSeq + ')');

        $.ajax({
            dataType: 'json',
            url: '/api/v1/listen/' + this._sessionId + '/' + this._pollSeq + tz,
            success: this._pollMsgsSuccess,
            error: this._pollMsgsFailure,
            context: this,
            timeout: 35000
        });
    },

    _pollMsgsSuccess: function(data) {
        this._pollSeq++;

        if (this._firstPoll) {
            this._firstPoll = false;
        }

        Ember.Logger.info('<-- Response to polling request');

        this._processCommands(data, false);
        this._pollMsgs();
    },

    _processCommands: function(commands, solicited) {
        for (var i = 0; i < commands.length; i++) {
            var command = commands[i];

            var prefix = '<-- MSG: ';
            if (!solicited) {
                // This is a response to polling request, it can contain
                // multiple commands
                prefix = '  |- MSG: ';
            }

//            Ember.Logger.info(prefix + JSON.stringify(command));

            if (command.id === 'SESSIONID') {
                this._sessionId = command.sessionId;
            } else {
                this._parser.process(command);
            }
        }
    },

    _handleFailure: function(jqxhr, textStatus, error ) {
        var err = textStatus + ', ' + error;
        console.log('Request Failed: ' + err );
    }
});