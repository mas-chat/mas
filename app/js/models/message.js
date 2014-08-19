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

Mas.Message = Ember.Object.extend({
    body: null,
    cat: null,
    ts: null,
    nick: null,
    type: null,

    ircMotd: false,

    decoratedBody: function() {
        return this._decorate(this.get('body'));
    }.property('body'),

    _decorate: function(text) {
        var textParts = [];
        var imgUrls = [];
        var pos = 0;
        var imgSuffixes = ['png', 'jpg', 'jpeg', 'gif'];

        URI.withinString(text, function(url, start, end, source) {
            var urlObj = new URI(url);
            var visibleLink;

            if (start !== pos) {
                textParts.push(this._escHtml(source.substring(pos, start), false));
            }

            if (imgSuffixes.indexOf(urlObj.suffix()) !== -1) {
                imgUrls.push('<li><a href="' + this._escHtml(url, true) + '" class="user-img">' +
                    '<img src="/images/client/spinner_96.gif" data-src="' +
                    this._escHtml(url, true) + '"></a></li>');
                visibleLink = this._escHtml(urlObj.filename(), false);
            } else {
                visibleLink = this._escHtml(urlObj.readable(), false);
            }

            textParts.push('<a href="' + this._escHtml(url, true) + '" target="_newtab">' +
                visibleLink + '</a>');
            pos = end;

            return url;
        }.bind(this));

        if (pos !== text.length) {
            textParts.push(this._escHtml(text.substring(pos), false));
        }

        var textSection = '<span class="body">' + textParts.join('') + '</span>';
        var imgSection = imgUrls.length ? '<ul class="user-image">' + imgUrls.join(' ') +
            '</ul>' : '';

        return emojify.replace(textSection) + imgSection;
    },

    _escHtml: function (string, full) {
        var res = string.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return full ? res.replace(/>/g, '&gt;').replace(/"/g, '&quot;') : res;
    }
});
