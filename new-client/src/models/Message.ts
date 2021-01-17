import { computed, observable, makeObservable } from 'mobx';
import marked from 'marked';
import dayjs from 'dayjs';
import URI from 'urijs';
import emoticons from '../lib/emoticons';
import WindowModel from './Window';
import userStore from '../stores/UserStore';
import { MessageCategory } from '../types/notifications';

marked.setOptions({
  breaks: true
});

export default class MessageModel {
  constructor(
    public readonly gid: number,
    public readonly body: string | undefined = undefined,
    public readonly cat:
      | 'msg'
      | 'join'
      | 'part'
      | 'quit'
      | 'kick'
      | 'day-divider'
      | 'error'
      | 'info'
      | 'server'
      | 'banner'
      | 'action',
    public readonly ts: number,
    public readonly userId: string | null,
    public readonly window: WindowModel,
    public readonly status: 'original' | 'deleted' | 'edited' = 'original',
    public readonly updatedTs: number | null = null,
    public readonly hideImages: boolean = false,
    public readonly editing: boolean = false,
    public readonly ircMotd: boolean = false
  ) {
    makeObservable(this, {
      body: observable,
      status: observable,
      updatedTs: observable,
      hideImages: observable,
      editing: observable,
      edited: computed,
      deleted: computed,
      updatedTime: computed,
      updatedDate: computed,
      updatedDateLong: computed,
      nick: computed,
      avatarUrl: computed,
      decoratedCat: computed,
      decoratedTs: computed,
      channelAction: computed,
      myNotDeletedMessage: computed,
      bodyParts: computed,
      text: computed,
      images: computed,
      hasMedia: computed,
      hasImages: computed,
      hasYoutubeVideo: computed,
      videoId: computed,
      videoParams: computed
    });
  }

  get edited() {
    return this.status === 'edited';
  }

  get deleted() {
    return this.status === 'deleted';
  }

  get updatedTime() {
    const updatedTs = this.updatedTs;

    if (!updatedTs) {
      return '';
    }

    const originalTime = dayjs.unix(this.ts);
    const updatedTime = dayjs.unix(updatedTs);

    return `at ${updatedTime.format(originalTime.isSame(updatedTime, 'd') ? 'HH:mm' : 'MMM Do HH:mm')}`;
  }

  get updatedDate() {
    const updatedTs = this.updatedTs;

    return updatedTs ? `at ${dayjs.unix(updatedTs).format('MMM Do HH:mm')}` : '';
  }

  get updatedDateLong() {
    const updatedTs = this.updatedTs;

    return updatedTs ? `at ${dayjs.unix(updatedTs).format('dddd, MMMM D HH:mm')}` : '';
  }

  get nick() {
    const user = this.userId && userStore.users.get(this.userId);

    if (!user || !this.window.network) {
      return null;
    }

    return user.nick[this.window.network];
  }

  get avatarUrl() {
    const user = this.userId && userStore.users.get(this.userId);
    return user ? `//gravatar.com/avatar/${user.gravatar}?d=mm` : '';
  }

  get decoratedCat(): MessageCategory | 'mention' | 'mymsg' | 'service' | 'day-divider' {
    const cat = this.cat;
    const body = this.body;
    const userId = this.userId;
    const nick = this.nick;

    const myNick = userStore.myNick(this.window.network);
    const mentionedRegEx = new RegExp(`(^|[@ ])${myNick}[ :]`);

    if (body && mentionedRegEx.test(body) && cat === 'msg') {
      return 'mention';
    }

    if (userId === userStore.userId && cat === 'msg') {
      return 'mymsg';
    }

    if (nick === 'ruuskanen') {
      return 'service';
    }

    return cat;
  }

  get decoratedTs() {
    return dayjs.unix(this.ts).format('HH:mm');
  }

  get channelAction() {
    const nick = this.nick;
    const groupName = this.window.name;
    const body = this.body;

    switch (this.cat) {
      case 'join':
        return `${nick} has joined ${groupName}.`;
      case 'part':
        return `${nick} has left ${groupName}. ${body}`;
      case 'quit':
        return `${nick} has quit irc. Reason: ${body}`;
      case 'kick':
        return `${nick} was kicked from ${groupName}. Reason: ${body}`;
      default:
        return '';
    }
  }

  get myNotDeletedMessage() {
    return this.decoratedCat === 'mymsg' && this.status !== 'deleted';
  }

  get bodyParts() {
    let body = this.body;
    const cat = this.cat;

    let parts: Array<{ type: string; text?: string; url?: string; start?: number }> = [];

    if (cat === 'msg' && body) {
      ({ body, parts } = this._parseLinks(body));
      body = marked(body);
      body = this._parseCustomFormatting(body);
    } else if (body) {
      body = this._escapeHTMLStartTag(body);
    }

    if (body) {
      body = this._parseWhiteSpace(body);
    }

    parts.push({ type: 'text', text: body });

    return parts;
  }

  // //redo

  get text() {
    return this.bodyParts.find(part => part.type === 'text')?.text;
  }

  get images() {
    return this.bodyParts.filter(part => part.type === 'image');
  }

  get hasMedia() {
    return !this.bodyParts.every(part => part.type === 'text');
  }

  get hasImages() {
    return this.bodyParts.some(part => part.type === 'image');
  }

  get hasYoutubeVideo() {
    return this.bodyParts.some(part => part.type === 'youtubelink');
  }

  get videoId() {
    const video = this.bodyParts.find(part => part.type === 'youtubelink');

    if (video) {
      const urlObj = new URI(video.url);
      // Format is https://www.youtube.com/watch?v=0P7O69GuCII or https://youtu.be/0P7O69GuCII
      return urlObj.search(true).v || urlObj.pathname().substring(1).split('/')[0];
    }
    return null;
  }

  get videoParams() {
    const video = this.bodyParts.find(part => part.type === 'youtubelink');
    const start = video && (video.start ? `&start=${video.start}` : '');

    return `showinfo=0&autohide=1${start}`;
  }

  _splitByLinks(text: string) {
    const parts = [];
    let previousEnd = 0;

    URI.withinString(text, (url, start: number, end: number) => {
      if (previousEnd !== start) {
        parts.push({ type: 'txt', data: text.substring(previousEnd, start) });
      }

      parts.push({ type: 'url', data: url });
      previousEnd = end;

      return '';
    });

    if (previousEnd !== text.length) {
      parts.push({ type: 'txt', data: text.substring(previousEnd) });
    }

    return parts;
  }

  _parseLinks(text: string) {
    const imgSuffixes = ['png', 'jpg', 'jpeg', 'gif'];
    const media = [];
    let body = '';

    const parts = this._splitByLinks(text);

    for (const part of parts) {
      if (part.type === 'url') {
        const urlObj = new URI(part.data);
        let visibleLink;
        const domain = urlObj.domain();

        if (imgSuffixes.indexOf(urlObj.suffix().toLowerCase()) !== -1) {
          visibleLink = decodeURIComponent(urlObj.filename());
          media.push({ type: 'image', url: urlObj.toString() });
        } else if ((domain === 'youtube.com' && urlObj.search(true).v) || domain === 'youtu.be') {
          visibleLink = urlObj.toString();

          let startTime = urlObj.search(true).t;

          if (Array.isArray(startTime)) {
            startTime = startTime[0];
          }

          let inSeconds = 0;

          if (startTime) {
            const re = startTime.match(/^(?:(\d{1,2})h)?(?:(\d{1,2})m)?(?:(\d{1,2})s)?$/);

            if (re) {
              inSeconds = parseInt(re[1] || '0') * 3600 + parseInt(re[2] || '0') * 60 + parseInt(re[3] || '0');
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
        } catch (e) {
          normalized = urlObj;
        }

        body += this._renderLink(normalized.toString(), this._escapeHTMLStartTag(visibleLink));
      } else {
        body += this._escapeHTMLStartTag(part.data);
      }
    }

    return { body, parts: media };
  }

  _parseWhiteSpace(text: string) {
    return text.replace(/ {2}/g, ' &nbsp;'); // Preserve whitespace.
  }

  _parseCustomFormatting(text: string) {
    let result;

    // Find @ character 1) after space, 2) in the beginning of string, 3) after HTML tag (>)
    result = text.replace(/(^| |>)(@\S+)(?=( |$))/g, (match, p1, p2) => this._renderMention(p1, p2));

    result = result.replace(/:\S+?:/g, match => {
      const emoji = emoticons[match];

      if (emoji) {
        return this._renderEmoji(match, emoji);
      }
      return match;
    });

    const keywords = result.match(/<(p|br)>/g);

    // Assumes that marked is used which inserts at least one <p>, <ol>, or <ul>
    const multiLine = !keywords || keywords.length > 1;

    if (!multiLine) {
      result = result.replace(/(\s*<p>|<\/p>\s*)/g, '');
    }

    return result;
  }

  _renderLink(url: string, label: string) {
    return `<a href="${url}" target="_blank">${label}</a>`;
  }

  _renderEmoji(name: string, src: string) {
    return `<img align="absmiddle" alt="${name}" title="${name}" class="emoji" src="https://twemoji.maxcdn.com/v/latest/72x72/${src}.png"/>`;
  }

  _renderMention(beforeCharacter: string, nick: string) {
    return `${beforeCharacter}<span class="nick-mention">${nick}</span>`;
  }

  _escapeHTMLStartTag(text: string) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }
}
