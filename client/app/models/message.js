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

import { A } from '@ember/array';

import EmberObject, { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import marked from 'npm:marked';
import emojione from 'npm:emojione';
import moment from 'npm:moment';
import URI from 'npm:urijs';
import BaseModel from './base';

marked.setOptions({
    breaks: true,
    tables: false
});

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

        this.set('_windowsStore', window.stores.windows);
        this.set('_usersStore', window.stores.users);
    },

    mentionedRegEx: alias('window.userNickHighlightRegex'),

    ircMotd: false,

    edited: computed('status', function() {
        return this.get('status') === 'edited';
    }),

    deleted: computed('status', function() {
        return this.get('status') === 'deleted';
    }),

    updatedTime: computed('updatedTs', function() {
        let updatedTs = this.get('updatedTs');

        if (!updatedTs) {
            return '';
        }

        let originalTime = moment.unix(this.get('ts'));
        let updatedTime = moment.unix(updatedTs);

        return `at ${updatedTime.format(originalTime.isSame(updatedTime, 'd') ?
            'HH:mm' : 'MMM Do HH:mm')}`;
    }),

    updatedDate: computed('updatedTs', function() {
        let updatedTs = this.get('updatedTs');

        return updatedTs ? `at ${moment.unix(updatedTs).format('MMM Do HH:mm')}` : '';
    }),

    updatedDateLong: computed('updatedTs', function() {
        let updatedTs = this.get('updatedTs');

        return updatedTs ? `at ${moment.unix(updatedTs).format('dddd, MMMM D HH:mm')}` : '';
    }),

    nick: computed('userId', 'window', function() {
        let user = this.get('_usersStore.users').getByIndex(this.get('userId'));
        return user ? user.get('nick')[this.get('window.network')] : '';
    }),

    avatarUrl: computed('userId', function() {
        let user = this.get('_usersStore.users').getByIndex(this.get('userId'));
        return user ? `//gravatar.com/avatar/${user.get('gravatar')}?d=mm` : '';
    }),

    decoratedCat: computed('cat', 'nick', 'body', 'mentionedRegEx', function() {
        let cat = this.get('cat');
        let body = this.get('body');
        let userId = this.get('userId');
        let nick = this.get('nick');
        let mentionedRegEx = this.get('mentionedRegEx');

        if (mentionedRegEx && mentionedRegEx.test(body) && cat === 'msg') {
            return 'mention';
        } else if (userId == this.get('_windowsStore.userId') && cat === 'msg') {
            return 'mymsg';
        } else if (nick === 'ruuskanen') {
            return 'service';
        }

        return cat;
    }),

    decoratedTs: computed('ts', function() {
        return moment.unix(this.get('ts')).format('HH:mm');
    }),

    channelAction: computed('cat', function() {
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

    myNotDeletedMessage: computed('decoratedCat', function() {
        return this.get('decoratedCat') === 'mymsg' && this.get('status') !== 'deleted';
    }),

    bodyParts: computed('body', function() {
        let body = this.get('body');
        let cat = this.get('cat');

        let parts = [];

        if (cat === 'msg') {
            ({ body, parts } = this._parseLinks(body));
            body = marked(body);
            body = this._parseCustomFormatting(body);
        } else {
            body = this._escapeHTMLStartTag(body);
        }

        body = this._parseWhiteSpace(body);

        parts.push({ type: 'text', text: body });

        return A(parts.map(item => EmberObject.create(item)));
    }),

    text: computed('bodyParts', function() {
        return this.get('bodyParts').findBy('type', 'text').text;
    }),

    images: computed('bodyParts', function() {
        return this.get('bodyParts').filterBy('type', 'image');
    }),

    hasMedia: computed('bodyParts', function() {
        return !this.get('bodyParts').isEvery('type', 'text');
    }),

    hasImages: computed('bodyParts', function() {
        return this.get('bodyParts').isAny('type', 'image');
    }),

    hasYoutubeVideo: computed('bodyParts', function() {
        return this.get('bodyParts').isAny('type', 'youtubelink');
    }),

    videoId: computed('bodyParts', function() {
        let video = this.get('bodyParts').findBy('type', 'youtubelink');

        if (video) {
            let urlObj = new URI(video.url);
            // Format is https://www.youtube.com/watch?v=0P7O69GuCII or https://youtu.be/0P7O69GuCII
            return urlObj.search(true).v || urlObj.pathname().substring(1).split('/')[0];
        } else {
            return null;
        }
    }),

    videoParams: computed('bodyParts', function() {
        let video = this.get('bodyParts').findBy('type', 'youtubelink');

        const start = video.start ? `&start=${video.start}` : '';

        return `showinfo=0&autohide=1${start}`;
    }),

    _splitByLinks(text) {
        const parts = [];
        let previousEnd = 0;

        URI.withinString(text, (url, start, end, source) => {
            if (previousEnd !== start) {
                parts.push({ type: 'txt', data: text.substring(previousEnd, start) });
            }

            parts.push({ type: 'url', data: url });
            previousEnd = end;
        });

        if (previousEnd !== text.length) {
            parts.push({ type: 'txt', data: text.substring(previousEnd) });
        }

        return parts;
    },

    _parseLinks(text) {
        let imgSuffixes = [ 'png', 'jpg', 'jpeg', 'gif' ];
        let media = [];
        let body = '';

        const parts = this._splitByLinks(text);

        for (const part of parts) {
            if (part.type === 'url') {
                let urlObj = new URI(part.data);
                let visibleLink;
                let domain = urlObj.domain();

                if (imgSuffixes.indexOf(urlObj.suffix().toLowerCase()) !== -1) {
                    visibleLink = urlObj.filename();
                    media.push({ type: 'image', url: urlObj.toString() });
                } else if ((domain === 'youtube.com' && urlObj.search(true).v) ||
                    domain === 'youtu.be') {
                    visibleLink = urlObj.toString();

                    const startTime = urlObj.search(true).t;
                    let inSeconds = 0;

                    if (startTime) {
                        const re = startTime.match(/^(?:(\d{1,2})h)?(?:(\d{1,2})m)?(?:(\d{1,2})s)?$/);

                        if (re) {
                            inSeconds = parseInt(re[1] || 0) * 3600 + parseInt(re[2] || 0) * 60 +
                                parseInt(re[3] || 0);
                        }
                    }

                    media.push({
                        type: 'youtubelink',
                        url: urlObj.toString(),
                        start: inSeconds
                    });
                } else {
                    visibleLink = urlObj.readable();
                }

                if (urlObj.protocol() === '') {
                    urlObj.protocol('http');
                }

                let normalized;

                try {
                    normalized = urlObj.normalize();
                } catch(e) {
                    normalized = urlObj;
                }

                body += this._renderLink(normalized.toString(), this._escapeHTMLStartTag(visibleLink));
            } else {
                body += this._escapeHTMLStartTag(part.data);
            }
        }

        return { body: body, parts: media };
    },

    _parseWhiteSpace(text) {
        return text.replace(/ {2}/g, ' &nbsp;'); // Preserve whitespace.
    },

    _parseCustomFormatting(text) {
        let network = this.get('network');

        // Find @ character 1) after space, 2) in the beginning of string, 3) after HTML tag (>)
        text = text.replace(/(^| |>)(@\S+)(?=( |$))/g,
            (match, p1, p2) => this._renderMention(p1, p2));

        // Convert Unicode emojis to :emojis:
        text = emojione.toShort(text);

        text = text.replace(/:\S+?:/g, match => {
            const emoji = emojione.emojioneList[match];

            if (emoji) {
                const unicode = emoji.unicode[emoji.unicode.length - 1];
                return this._renderEmoji(match, `/app/assets/images/emoji/${unicode}.png`);
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
        return `<img align="absmiddle" alt="${name}" title="${name}" class="emoji" src="${src}"/>`;
    },

    _renderMention(beforeCharacter, nick) {
        return `${beforeCharacter}<span class="nick-mention">${nick}</span>`;
    },

    _escapeHTMLStartTag(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }
});
