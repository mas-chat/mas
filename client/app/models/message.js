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

/* globals URI, emojify */

import Ember from 'ember';

export default Ember.Object.extend({
    body: null,
    cat: null,
    ts: null,
    userId: null,
    type: null,
    window: null,
    nick: '',

    ircMotd: false,

    userIdDidChange: function() {
        var userId = this.get('userId');
        var network = this.get('window.network');

        if (userId && network) {
            this.set('nick', this.get('store.users').getNick(userId, network));
        }
    }.observes('userId', 'window').on('init'),

    decoratedBody: function() {
        var category = this.get('cat');
        var nick = this.get('nick');
        var pre = '<span class="body">';
        var post = '</span>';

        if (category === 'join') {
            return pre + nick + ' has joined the group.' + post;
        } else if (category === 'part') {
            return pre + nick + ' has left the group.' + post;
        } else if (category === 'quit') {
            return pre + nick + ' has quit irc.' + post;
        } else {
            return this._decorate(this.get('body'));
        }
    }.property('body'),

    _decorate: function(text) {
        var textParts = [];
        var imgUrls = [];
        var pos = 0;
        var imgSuffixes = [ 'png', 'jpg', 'jpeg', 'gif' ];

        URI.withinString(text, function(url, start, end, source) {
            var urlObj = new URI(url);
            var visibleLink;

            if (start !== pos) {
                textParts.push(this._escHtml(source.substring(pos, start), false));
            }

            if (imgSuffixes.indexOf(urlObj.suffix()) !== -1) {
                imgUrls.push('<li><a href="' + this._escHtml(url, true) + '" class="user-img">' +
                    '<img src="/app/assets/images/spinner_96.gif" data-src="' +
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

        var processedText = textParts.join('');

        // Legacy thumb up emoji
        processedText = processedText.replace('*thumb up*', ':thumbsup: ');

        // Other emojis
        processedText = emojify.replace(processedText);

        var imgSection = imgUrls.length ? '<ul class="user-image">' + imgUrls.join(' ') +
            '</ul>' : '';
        var textSection = '<span class="body">' + processedText + '</span>';

        return textSection + imgSection;
    },

    _escHtml: function(string, full) {
        var res = string.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return full ? res.replace(/>/g, '&gt;').replace(/"/g, '&quot;') : res;
    }
});
