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

App.CommandParser = Ember.Object.extend({
    _nextMessageId: 0,
    _row: 0, // TBD: HACK

    process: function(command) {
        var name = command.id;
        var funcName = '_handle' + name.charAt(0) + name.substring(1).toLowerCase();

        if (!this[funcName]) {
            Ember.Logger.warn('Unknown command received: ' + name);
            return;
        }

        this[funcName](command);
    },

    _handleCreate: function(command) {
        var windowRecord = command;
        windowRecord.id = windowRecord.windowId;
        delete windowRecord.windowId;

        windowRecord.row = this._row // TDB: HACK
        if (windowRecord.id % 2 === 1) {
            this._row++;
        }
        windowRecord.lastInRow = false; // REMOVE
        windowRecord.firstInRow = false; // REMOVE

        this.get('store').push('window', windowRecord);
    },

    _handleAddtext: function(command) {
        var messageRecord = command;
        messageRecord.id = this._nextMessageId++;
        messageRecord.window = messageRecord.windowId;
        delete messageRecord.windowId;

        this.get('store').push('message', messageRecord);
    }
});