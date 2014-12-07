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

export default Ember.ArrayController.extend({
    needs: [ 'application' ],

    actions: {
        joinLobby: function() {
            this.remote.send({
                id: 'JOIN',
                network: 'MAS',
                name: 'lobby'
            });
        }
    },

    initDone: Ember.computed.alias('controllers.application.initDone'),

    nextRow: function(item, direction) {
        var windows = this.get('model').filter(function(val) {
            return val.get('visible');
        }).sortBy('row');

        var index =  windows.indexOf(item);
        var row = windows[index].get('row');

        for (var i = index + direction; i >= 0 && i < windows.length; i += direction) {
            var currentRow = windows[i].get('row');

            if (currentRow !== row) {
                return currentRow;
            }
        }

        return row + direction;
    }
});
