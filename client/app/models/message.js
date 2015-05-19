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

/* globals URI, moment, emojify */

import Ember from 'ember';

export default Ember.Object.extend({
    store: null,

    gid: 0,
    body: null,
    cat: null,
    ts: null,
    userId: null,
    window: null,
    hideImages: false,

    mentionedRegEx: Ember.computed.alias('window.userNickHighlightRegex'),

    ircMotd: false,

    nick: Ember.computed('userId', 'window', function() {
        return this.get('store.users').getNick(this.get('userId'), this.get('window.network'));
    }),

    decoratedCat: Ember.computed('cat', 'nick', 'body', 'mentionedRegEx', function() {
        let cat = this.get('cat');
        let body = this.get('body');
        let mentionedRegEx = this.get('mentionedRegEx');

        // TBD: Network === flowdock check is missing
        if (this.get('body').indexOf('Show in Flowdock:') > -1) {
            return 'flowdock-ignore';
        }

        if (mentionedRegEx && mentionedRegEx.test(body) && cat === 'msg') {
            return 'mention';
        }

        return this.get('nick') === 'Flowdock' ? 'flowdock' : cat;
    }),

    decoratedTs: Ember.computed('ts', function() {
        return moment.unix(this.get('ts')).format('HH:mm');
    }),

    channelAction: Ember.computed('cat', function() {
        let category = this.get('cat');
        let nick = this.get('nick');
        let groupName = this.get('window.name');
        let body = this.get('body');

        switch (category) {
            case 'join':
                return `${nick} has joined ${groupName}.`;
            case 'part':
                return `${nick} has left ${groupName}. ${body}`;
            case 'quit':
                return `${nick} has quit irc. Reason: ${body}`;
            case 'kick':
                return `${nick} was kicked from ${groupName}. Reason: ${body}`;
        }
    }),

    bodyParts: Ember.computed('body', function() {
        let result = Ember.A([]);
        let pos = 0;
        let imgSuffixes = [ 'png', 'jpg', 'jpeg', 'gif' ];
        let body = this.get('body');
        let network = this.get('network');
        let cat = this.get('cat');

        // TBD: Do parsing in two stages, first images and rest. Then rest in detail.
        URI.withinString(body, function(url, start, end, source) {
            let urlObj = new URI(url);
            let visibleLink;
            let media = false;
            let type = '';

            if (start !== pos) {
                this._parseText(result, source.substring(pos, start), network, cat);
            }

            if (imgSuffixes.indexOf(urlObj.suffix().toLowerCase()) !== -1) {
                visibleLink = urlObj.filename();
                media = true;
                type = 'image';
            } else if (urlObj.domain() === 'youtube.com' && urlObj.search(true).v) {
                visibleLink = urlObj.toString();
                media = true;
                type = 'youtubelink';
            } else {
                visibleLink = urlObj.readable();
            }

            if (urlObj.protocol() === '') {
                urlObj.protocol('http');
            }

            this._pushPart(result, {
                link: true,
                text: visibleLink,
                url: urlObj.toString(),
                media: media,
                type: type,
                source: '',
                loaded: false
            });

            pos = end;

            return url;
        }.bind(this));

        if (body && body.length !== pos) {
            this._parseText(result, body.substring(pos), network, cat);
        }

        return result;
    }),

    hasMedia: Ember.computed('bodyParts', function() {
        return this.get('bodyParts').isAny('media', true);
    }),

    hasImages: Ember.computed('bodyParts', function() {
        return this.get('bodyParts').isAny('type', 'image');
    }),

    hasYoutubeVideo: Ember.computed('bodyParts', function() {
        return this.get('bodyParts').isAny('type', 'youtubelink');
    }),

    videoId: Ember.computed('bodyParts', function() {
        let video = this.get('bodyParts').findBy('type', 'youtubelink');

        if (video) {
            let urlObj = new URI(video.url);
            return urlObj.search(true).v;
        } else {
            return null;
        }
    }),

    images: Ember.computed('bodyParts', function() {
        return this.get('bodyParts').filterBy('type', 'image');
    }),

    _pushPart(array, params) {
        array.pushObject(Ember.Object.create(params));
    },

    _parseText(result, text, network, cat) {
        if (network === 'Flowdock') {
            text = text.replace(/^\[(.*?)\] &lt;&lt; (.*)/, function(match, p1, p2) {
                return '[' + p1.substring(0, 9) + '] ' + p2;
            });
        }

        if (cat === 'banner') {
            text = text.replace(/ /g, 'ˑ'); // Preserve whitespace trick.
        }

        // Emoji and @mention separation
        let parts = text.split(/(:\S+:|(?:^| )@\S+ )/);

        parts.forEach(function(part) {
            let emojiMatch = /^:(.+):$/.exec(part);
            let isEmoji = emojiMatch && emojify.emojiNames.indexOf(emojiMatch[1]) > -1;

            if (isEmoji) {
                this._pushPart(result, {
                    link: false,
                    text: part,
                    emoji: emojiMatch[1]
                });
                return;
            }

            let mentionMatch = /^\s?(@\S+) $/.exec(part);

            if (mentionMatch) {
                this._pushPart(result, {
                    link: false,
                    mention: true,
                    text: mentionMatch[1]
                });
                return;
            }

            // Plain text
            this._pushPart(result, {
                link: false,
                text: part
            });
        }.bind(this));
    }
});
