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

Mas.CommandParser = Ember.Object.extend({
    process: function(command) {
        var name = command.id;
        var targetWindow = null;
        var windowId = command.windowId;

        delete command.id;

        if (typeof windowId === 'number') {
            targetWindow = Mas.windowCollection.findBy('windowId', windowId);
        }

        var funcName = '_handle' + name.charAt(0) + name.substring(1).toLowerCase();

        if (!this[funcName]) {
            Ember.Logger.warn('Unknown command received: ' + name);
        } else {
            this[funcName](command, targetWindow);
        }
    },

    _handleCreate: function(data) {
        var windowRecord = Mas.Window.create(data);
        Mas.windowCollection.pushObject(windowRecord);
    },

    _handleClose: function(data, targetWindow) {
        Mas.windowCollection.removeObject(targetWindow);
    },

    _handleAddtext: function(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        delete data.windowId;
        var messageRecord = Mas.Message.create(data);
        var messages = targetWindow.messages;

        if (messages.length > 200) {
            messages.shiftObject();
            targetWindow.deletedLine = true;
        }

        messages.pushObject(messageRecord);
    },

    _handleNick: function(data) {
        jQuery.extend(Mas.nicks, data);
    },

    _handleInitdone: function() {
        Mas.windowCollection.setEach('initDone', true);
        Mas.__container__.lookup("controller:application").set('initDone', true); // TBD: Improve
    },

    _handleUpdatenames: function(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        if (data.reset) {
            targetWindow.operators.clear();
            targetWindow.voices.clear();
            targetWindow.users.clear();
        }

        for (var name in data.names) { /* jshint -W089 */
            var userClass = data.names[name];
            this._removeName(name, targetWindow);

            switch (userClass) {
                case '@':
                    targetWindow.operators.pushObject(name);
                    break;
                case '+':
                    targetWindow.voices.pushObject(name);
                    break;
                default:
                    targetWindow.users.pushObject(name);
                    break;
            }
        }
    },

    _handleDelnames: function(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        data.names.forEach(function(name) {
            this._removeName(name, targetWindow);
        });
    },

    _handleUpdate: function(data, targetWindow) {
        if (!targetWindow) {
            return;
        }

        targetWindow.setProperties(data);
    },

    _removeName: function(name, targetWindow) {
        targetWindow.operators.removeObject(name);
        targetWindow.voices.removeObject(name);
        targetWindow.users.removeObject(name);
    }
});
