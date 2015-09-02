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
        let userId = this.get('userId');
        let mentionedRegEx = this.get('mentionedRegEx');

        // TBD: Network === flowdock check is missing
        if (this.get('body').indexOf('Show in Flowdock:') > -1) {
            return 'flowdock-ignore';
        } else if (mentionedRegEx && mentionedRegEx.test(body) && cat === 'msg') {
            return 'mention';
        } else if (userId == this.get('store.userId')) {
            return 'mymsg';
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

        // TODO: Security review the whole algorithm
        body = this._escapeHTMLStartTag(body);

        body = URI.withinString(body, (url, start, end, source) => {
            let urlObj = new URI(url);
            let visibleLink;
            let type = 'generic';
            let domain = urlObj.domain();

            if (imgSuffixes.indexOf(urlObj.suffix().toLowerCase()) !== -1) {
                visibleLink = urlObj.filename();
                type = 'image';
            } else if ((domain === 'youtube.com' && urlObj.search(true).v) ||
                domain === 'youtu.be') {
                visibleLink = urlObj.toString();
                type = 'youtubelink';
            } else {
                visibleLink = urlObj.readable();
            }

            if (urlObj.protocol() === '') {
                urlObj.protocol('http');
            }

            if (type === 'image' || type === 'youtubelink') {
                this._pushPart(result, {
                    type: type,
                    url: urlObj.toString()
                });
            }

            return this._renderLink(urlObj.normalize().toString(), visibleLink);
        });

        body = marked(body);

        this._pushPart(result, {
            type: 'text',
            text: this._parseCustomFormatting(body, network, cat)
        });

        return result;
    }),

    hasMedia: Ember.computed('bodyParts', function() {
        return !this.get('bodyParts').isEvery('type', 'text');
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
            // Format is https://www.youtube.com/watch?v=0P7O69GuCII or https://youtu.be/0P7O69GuCII
            return urlObj.search(true).v || urlObj.pathname().substring(1).split('/')[0];
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

    _parseCustomFormatting(text, network, cat) {
        if (network === 'Flowdock') {
            text = text.replace(/^\[(.*?)\] &lt;&lt; (.*)/,
                (match, p1, p2) => `[${p1.substring(0, 9)}] ${p2}`);
        }

        text = text.replace(/  /g, ' &nbsp;'); // Preserve whitespace.

        // Find @ character 1) after space, 2) in the beginning of string, 3) after HTML tag (>)
        text = text.replace(/(^| |>)(@\S+)(?=( |$))/g,
            (match, p1, p2) => this._renderMention(p1, p2));

        text = text.replace(/:(.+?):/g, (match, p1) => {
            if (!emojify.emojiNames.includes(p1)) {
                return match;
            } else {
                return this._renderEmoji(match, `/app/assets/images/emoji/${p1}.png`);
            }
        });

        let keywords = text.match(/<(p|br)>/g);

        // Assumes that marked is used which inserts at least one <p>, <ol>, or <ul>
        let multiLine = !keywords || keywords.length > 1;

        if (!multiLine) {
            text = text.replace(/(\s*<p>|<\/p>\s*)/g, '');
        }

        return text;
    },

    _renderLink(url, label) {
        return `<a href="${url}" target="_blank">${label}</a>`;
    },

    _renderEmoji(name, src) {
        return `<img align="absmiddle" alt="${name}" class="emoji" src="${src}"/>`;
    },

    _renderMention(beforeCharacter, nick) {
        return `${beforeCharacter}<span class="nick-mention">${nick}</span>`;
    },

    _escapeHTMLStartTag(text) {
        return text.replace(/<]/g, '&lt;');
    }
});
