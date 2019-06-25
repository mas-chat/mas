import { computed, observable } from 'mobx';
import marked from 'marked';
import emojione from 'emojione';
import moment from 'moment';
import URI from 'urijs';
import userStore from '../stores/UserStore';

marked.setOptions({
  breaks: true,
  tables: false
});

export default class MessageModel {
  gid = 0;
  @observable body = null;
  cat = null;
  ts = null;
  userId = null;
  window = null;
  @observable status = 'original';
  @observable updatedTs = null;

  @observable hideImages = false;
  @observable editing = false;

  ircMotd = false;

  constructor(store, props) {
    Object.assign(this, props);
  }

  @computed
  get edited() {
    return this.status === 'edited';
  }

  @computed
  get deleted() {
    return this.status === 'deleted';
  }

  @computed
  get updatedTime() {
    const updatedTs = this.updatedTs;

    if (!updatedTs) {
      return '';
    }

    const originalTime = moment.unix(this.ts);
    const updatedTime = moment.unix(updatedTs);

    return `at ${updatedTime.format(originalTime.isSame(updatedTime, 'd') ? 'HH:mm' : 'MMM Do HH:mm')}`;
  }

  @computed
  get updatedDate() {
    const updatedTs = this.updatedTs;

    return updatedTs ? `at ${moment.unix(updatedTs).format('MMM Do HH:mm')}` : '';
  }

  @computed
  get updatedDateLong() {
    const updatedTs = this.updatedTs;

    return updatedTs ? `at ${moment.unix(updatedTs).format('dddd, MMMM D HH:mm')}` : '';
  }

  @computed
  get nick() {
    const user = userStore.users.get(this.userId);
    return user ? user.nick[this.window.network] : '';
  }

  @computed
  get avatarUrl() {
    const user = userStore.users.get(this.userId);
    return user ? `//gravatar.com/avatar/${user.gravatar}?d=mm` : '';
  }

  @computed
  get decoratedCat() {
    const cat = this.cat;
    const body = this.body;
    const userId = this.userId;
    const nick = this.nick;

    const myNick = userStore.users.get(userStore.userId).nick[this.window.network];
    const mentionedRegEx = new RegExp(`(^|[@ ])${myNick}[ :]`);

    if (mentionedRegEx && mentionedRegEx.test(body) && cat === 'msg') {
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

  @computed
  get decoratedTs() {
    return moment.unix(this.ts).format('HH:mm');
  }

  @computed
  get channelAction() {
    const category = this.cat;
    const nick = this.nick;
    const groupName = this.window.name;
    const body = this.body;

    switch (category) {
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

  @computed
  get myNotDeletedMessage() {
    return this.decoratedCat === 'mymsg' && this.status !== 'deleted';
  }

  @computed
  get bodyParts() {
    let body = this.body;
    const cat = this.cat;

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

    return parts;
  }

  // //redo

  @computed
  get text() {
    return this.bodyParts.find(part => part.type === 'text').text;
  }

  @computed
  get images() {
    return this.bodyParts.filter(part => part.type === 'image');
  }

  @computed
  get hasMedia() {
    return !this.bodyParts.every(part => part.type === 'text');
  }

  @computed
  get hasImages() {
    return this.bodyParts.some(part => part.type === 'image');
  }

  @computed
  get hasYoutubeVideo() {
    return this.bodyParts.some(part => part.type === 'youtubelink');
  }

  @computed
  get videoId() {
    const video = this.bodyParts.find(part => part.type === 'youtubelink');

    if (video) {
      const urlObj = new URI(video.url);
      // Format is https://www.youtube.com/watch?v=0P7O69GuCII or https://youtu.be/0P7O69GuCII
      return (
        urlObj.search(true).v ||
        urlObj
          .pathname()
          .substring(1)
          .split('/')[0]
      );
    }
    return null;
  }

  @computed
  get videoParams() {
    const video = this.bodyParts.find(part => part.type === 'youtubelink');
    const start = video && (video.start ? `&start=${video.start}` : '');

    return `showinfo=0&autohide=1${start}`;
  }

  _splitByLinks(text) {
    const parts = [];
    let previousEnd = 0;

    URI.withinString(text, (url, start, end) => {
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
  }

  _parseLinks(text) {
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

          const startTime = urlObj.search(true).t;
          let inSeconds = 0;

          if (startTime) {
            const re = startTime.match(/^(?:(\d{1,2})h)?(?:(\d{1,2})m)?(?:(\d{1,2})s)?$/);

            if (re) {
              inSeconds = parseInt(re[1] || 0) * 3600 + parseInt(re[2] || 0) * 60 + parseInt(re[3] || 0);
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

  _parseWhiteSpace(text) {
    return text.replace(/ {2}/g, ' &nbsp;'); // Preserve whitespace.
  }

  _parseCustomFormatting(text) {
    let result;

    // Find @ character 1) after space, 2) in the beginning of string, 3) after HTML tag (>)
    result = text.replace(/(^| |>)(@\S+)(?=( |$))/g, (match, p1, p2) => this._renderMention(p1, p2));

    // Convert Unicode emojis to :emojis:
    result = emojione.toShort(result);

    result = result.replace(/:\S+?:/g, match => {
      const emoji = emojione.emojioneList[match];

      if (emoji) {
        const unicode = emoji.unicode[emoji.unicode.length - 1];
        return this._renderEmoji(match, `/app/assets/images/emoji/${unicode}.png`);
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

  _renderLink(url, label) {
    return `<a href="${url}" target="_blank">${label}</a>`;
  }

  _renderEmoji(name, src) {
    return `<img align="absmiddle" alt="${name}" title="${name}" class="emoji" src="${src}"/>`;
  }

  _renderMention(beforeCharacter, nick) {
    return `${beforeCharacter}<span class="nick-mention">${nick}</span>`;
  }

  _escapeHTMLStartTag(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }
}
