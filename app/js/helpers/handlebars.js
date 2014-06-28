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

Ember.Handlebars.helper('decoratedTimestamp', function(timestamp) {
    return new Handlebars.SafeString(moment.unix(timestamp).format('HH:mm'));
});

Ember.Handlebars.helper('decoratedTitle', function(name, network, type, topic) {
    var title;

    if (type === '1on1') {
        var conversationNetwork = network === 'MAS' ? '' : network + ' ';
        title = 'Private ' + conversationNetwork + 'conversation with ' + name;
    } else if (network === 'MAS') {
        title = 'Group: ' + name;
    } else {
        title = network + ': ' + name;
    }

    if (topic) {
        title += ' - ' + Handlebars.Utils.escapeExpression(topic);
    }

    return new Handlebars.SafeString(title);
});

Ember.Handlebars.helper('startWindowRow', function(currentWindow, allVisibleWindows) {
    var index = allVisibleWindows.indexOf(currentWindow);
    var res = '';

    if (index === 0 || currentWindow.get('row') !== allVisibleWindows[index - 1].get('row')) {
        res = new Handlebars.SafeString('<div class="flex-grow-row flex-1">');
   }

   return res;
});

Ember.Handlebars.helper('endWindowRow', function(currentWindow, allVisibleWindows) {
    var index = allVisibleWindows.indexOf(currentWindow);
    var res = '';

    if (index === allVisibleWindows.length - 1 ||
        currentWindow.get('row') !== allVisibleWindows[index + 1].get('row')) {
        res = new Handlebars.SafeString('</div>');
    }

    return res;
});
