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

App.MainController = Ember.ArrayController.extend({
    windows: function() {
        // Override model property with a filter to get live updates
        return this.get('store').filter('window', function() {
            return true;
        });
    }.property(),

    sortedWindows: function() {
        // Mark first and last window on every row
        return this.get('windows').sortBy('row').map(function(value, index, array) {
            var last = false;
            var first = false;

            if (index === array.length - 1 || value.get('row') !== array[index + 1].get('row')) {
                last = true;
            }

            if (index === 0 || value.get('row') !== array[index - 1].get('row')) {
                first = true;
            }

            value.set('lastInRow', last);
            value.set('firstInRow', first);

            return value;
        });
    }.property('windows.[]')
});