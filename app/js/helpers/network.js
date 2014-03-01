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

App.Network = Ember.Object.extend({
    _sessionId: 0,
    _pollSeq: 0,
    _sendSeq: 0,
    _firstPoll: true,

    init: function() {
        this._pollMsgs();
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
            success: this._processResponse,
            error: this._handleFailure,
            timeout: 35000
        });
    },

    _processResponse: function(data) {
        Ember.Logger.info('Got good response' + data);
    },

    _handleFailure: function(jqxhr, textStatus, error ) {
        var err = textStatus + ', ' + error;
        console.log('Request Failed: ' + err );
    }
});