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

Ember.Handlebars.helper('decoratedBody', function(text) {
    function escHtml(string, full) {
        var res = string.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return full ? res.replace(/>/g, '&gt;').replace(/"/g, '&quot;') : res;
    }

    var parts = [];
    var pos = 0;

    URI.withinString(text, function(url, start, end, source) {
        var urlObj = new URI(url);

        if (start !== pos) {
            parts.push(escHtml(source.substring(pos, start), false));
        }

        parts.push('<a href="' + escHtml(url, true) + '">' +
            escHtml(urlObj.readable(), false) + '</a>');

        pos = end;
        return url;
    });

    if (pos !== text.length) {
        parts.push(escHtml(text.substring(pos), false));
    }

    return new Handlebars.SafeString(parts.join(''));
});

Ember.Handlebars.helper('decoratedTitle', function(name, network, type) {
    var title;

    if (type === '1on1') {
        var conversationNetwork = network === 'MeetAndSpeak' ? '' : network + ' ';
        title = 'Private ' + conversationNetwork + 'conversation with ' + name;
    } else if (network === 'MeetAndSpeak') {
        title = 'Group: ' + name;
    } else {
        title = network + ' channel: ' + name;
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
