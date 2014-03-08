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
    _row: 0, // TBD: HACK

    process: function(command) {
        var name = command.id;
        delete command.id;

        var funcName = '_handle' + name.charAt(0) + name.substring(1).toLowerCase();

        if (!this[funcName]) {
            Ember.Logger.warn('Unknown command received: ' + name);
            return;
        }

        this[funcName](command);
    },

    _handleCreate: function(data) {
        data.row = this._row; // TDB: HACK
        if (data.windowId % 3 === 2) {
            this._row++;
        }

        var windowRecord = App.Window.create(data);
        App.windowCollection.pushObject(windowRecord);
    },

    _handleAddtext: function(data) {
        var targetWindow = App.windowCollection.findBy('windowId', data.windowId);
        delete data.windowId;

        var messageRecord = App.Message.create(data);
        targetWindow.messages.pushObject(messageRecord);
    },

    _handleNick: function(data) {
        jQuery.extend(App.nicks, data);
    }
});