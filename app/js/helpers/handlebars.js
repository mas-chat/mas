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

    var textParts = [];
    var imgUrls = [];
    var pos = 0;
    var imgSuffixes = ['png', 'jpg', 'jpeg'];

    URI.withinString(text, function(url, start, end, source) {
        var urlObj = new URI(url);
        var visibleLink;

        if (start !== pos) {
            textParts.push(escHtml(source.substring(pos, start), false));
        }

        if (imgSuffixes.indexOf(urlObj.suffix()) !== -1) {
            imgUrls.push('<li><a href="' + escHtml(url, true) + '" target="_newtab">' +
                '<img src="' + escHtml(url, true) + '"></a></li>');
            visibleLink = escHtml(urlObj.filename(), false);
        } else {
            visibleLink = escHtml(urlObj.readable(), false);
        }

        textParts.push('<a href="' + escHtml(url, true) + '">' + visibleLink+ '</a>');
        pos = end;

        return url;
    });

    if (pos !== text.length) {
        textParts.push(escHtml(text.substring(pos), false));
    }

    var textSection = '<span class="body">' + textParts.join('') + '</span>';
    var imgSection = imgUrls.length ? '<ul class="user-image">' + imgUrls.join(' ') + '</ul>' : '';

    return new Handlebars.SafeString(textSection + imgSection);
});

Ember.Handlebars.helper('decoratedTitle', function(name, network, type) {
    var title;

    if (type === '1on1') {
        var conversationNetwork = network === 'MAS' ? '' : network + ' ';
        title = 'Private ' + conversationNetwork + 'conversation with ' + name;
    } else if (network === 'MAS') {
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
