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

/* globals URI, moment, emojify, marked */

import Ember from 'ember';
import BaseModel from './base';
import { getStore } from 'emflux/dispatcher';

export default BaseModel.extend({
    gid: 0,
    body: null,
    cat: null,
    ts: null,
    userId: null,
    window: null,
    status: 'original',
    updatedTs: null,

    hideImages: false,
    editing: false,

    // Other stores
    _windowsStore: null,
    _usersStore: null,

    init() {
        this._super();

        this.set('_windowsStore', getStore('windows'));
        this.set('_usersStore', getStore('users'));
    },

    mentionedRegEx: Ember.computed.alias('window.userNickHighlightRegex'),

    ircMotd: false,

    edited: Ember.computed('status', function() {
        return this.get('status') === 'edited';
    }),

    deleted: Ember.computed('status', function() {
        return this.get('status') === 'deleted';
    }),

    updatedTime: Ember.computed('updatedTs', function() {
        let updatedTs = this.get('updatedTs');

        if (!updatedTs) {
            return '';
        }

        let originalTime = moment.unix(this.get('ts'));
        let updatedTime = moment.unix(updatedTs);

        return `at ${updatedTime.format(originalTime.isSame(updatedTime, 'd') ?
            'HH:mm' : 'MMM Do HH:mm')}`;
    }),

    updatedDate: Ember.computed('updatedTs', function() {
        let updatedTs = this.get('updatedTs');

        return updatedTs ? `at ${moment.unix(updatedTs).format('MMM Do HH:mm')}` : '';
    }),

    updatedDateLong: Ember.computed('updatedTs', function() {
        let updatedTs = this.get('updatedTs');

        return updatedTs ? `at ${moment.unix(updatedTs).format('dddd, MMMM D HH:mm')}` : '';
    }),

    nick: Ember.computed('userId', 'window', function() {
        let user = this.get('_usersStore.users').getByIndex(this.get('userId'));
        return user ? user.get('nick')[this.get('window.network')] : '';
    }),

    avatarUrl: Ember.computed('userId', function() {
        let user = this.get('_usersStore.users').getByIndex(this.get('userId'));
        return user ? `//gravatar.com/avatar/${user.get('gravatar')}?d=mm` : '';
    }),

    decoratedCat: Ember.computed('cat', 'nick', 'body', 'mentionedRegEx', function() {
        let cat = this.get('cat');
        let body = this.get('body');
        let userId = this.get('userId');
        let nick = this.get('nick');
        let mentionedRegEx = this.get('mentionedRegEx');

        // TODO: Network === flowdock check is missing
        if (this.get('body').indexOf('Show in Flowdock:') > -1) {
            return 'flowdock-ignore';
        } else if (mentionedRegEx && mentionedRegEx.test(body) && cat === 'msg') {
            return 'mention';
        } else if (userId == this.get('_windowsStore.userId') && cat === 'msg') {
            return 'mymsg';
        } else if (nick === 'ruuskanen') {
            return 'service';
        }

        return nick === 'Flowdock' ? 'flowdock' : cat;
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

    myNotDeletedMessage: Ember.computed('decoratedCat', function() {
        return this.get('decoratedCat') === 'mymsg' && this.get('status') !== 'deleted';
    }),

    bodyParts: Ember.computed('body', function() {
        let body = this.get('body');
        let cat = this.get('cat');

        let parts = [];

        body = this._escapeHTMLStartTag(body);

        if (cat === 'msg') {
            ({ body, parts } = this._parseLinks(body));

            body = marked(body);
            body = this._parseCustomFormatting(body);
        }

        body = this._parseWhiteSpace(body);

        parts.push({ type: 'text', text: body });

        return Ember.A(parts.map(item => Ember.Object.create(item)));
    }),

    text: Ember.computed('bodyParts', function() {
        return this.get('bodyParts').findBy('type', 'text').text;
    }),

    images: Ember.computed('bodyParts', function() {
        return this.get('bodyParts').filterBy('type', 'image');
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

    _parseLinks(text) {
        let imgSuffixes = [ 'png', 'jpg', 'jpeg', 'gif' ];
        let media = [];

        text = URI.withinString(text, url => {
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
                media.push({
                    type: type,
                    url: urlObj.toString()
                });
            }

            return this._renderLink(urlObj.normalize().toString(), visibleLink);
        });

        return { body: text, parts: media };
    },

    _parseWhiteSpace(text) {
        return text.replace(/ {2}/g, ' &nbsp;'); // Preserve whitespace.
    },

    _parseCustomFormatting(text) {
        let network = this.get('network');

        if (network === 'Flowdock') {
            text = text.replace(/^\[(.*?)\] &lt;&lt; (.*)/,
                (match, p1, p2) => `[${p1.substring(0, 9)}] ${p2}`);
        }

        // Find @ character 1) after space, 2) in the beginning of string, 3) after HTML tag (>)
        text = text.replace(/(^| |>)(@\S+)(?=( |$))/g,
            (match, p1, p2) => this._renderMention(p1, p2));

        text = text.replace(/:(.+?):/g, (match, p1) => {
            if (emojify.emojiNames.indexOf(p1) !== -1) {
                return this._renderEmoji(match, `/app/assets/images/emoji/${p1}.png`);
            } else {
                return match;
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
