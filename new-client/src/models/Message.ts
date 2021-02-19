import { computed, observable, makeObservable } from 'mobx';
import dayjs, { Dayjs } from 'dayjs';
import URI from 'urijs';
import buildEmojiRegex from 'emoji-regex';
import emojiUnicode from 'emoji-unicode';
import WindowModel from './Window';
import UserModel, { me } from './User';
import emoticons from '../lib/emoticons';
import { MessageCategory, MessageRecord, MessageStatus } from '../types/notifications';

const EMOTICON_REGEX = /(:[^\s:]+:)/;
const EMOJI_REGEX = new RegExp(`(${buildEmojiRegex().source})`);
const IMAGE_SUFFIXES = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

export enum UrlPartSubType {
  Generic,
  Image,
  Video
}

type TextPart = { type: 'text'; text: string };
type GenericUrlPart = { type: 'url'; url: URI; class: UrlPartSubType.Generic };
type ImageUrlPart = { type: 'url'; url: URI; class: UrlPartSubType.Image };
type VideoUrlPart = { type: 'url'; url: URI; class: UrlPartSubType.Video; videoId: string; startTime: number };
export type EmojiPart = { type: 'emoji'; shortCode?: string; emoji: string; codePoint: string };
type MentionPart = { type: 'mention'; text: string; userId: string };

type BodyPart = TextPart | GenericUrlPart | ImageUrlPart | VideoUrlPart | EmojiPart | MentionPart;

export type MessageModelProps = {
  gid: number;
  body?: string;
  category: MessageCategory;
  ts: number;
  updatedTs?: number;
  user: UserModel;
  window: WindowModel;
  status: MessageStatus;
};

export default class MessageModel {
  public readonly gid: number;
  public body = '';
  private readonly category: MessageCategory;
  public readonly ts: Dayjs;
  public updatedTs?: Dayjs;
  public readonly user: UserModel;
  public readonly window: WindowModel;
  public status: MessageStatus;

  constructor({ gid, body, category, ts, updatedTs, user, window, status }: MessageModelProps) {
    this.gid = gid;
    this.body = body || '';
    this.category = category;
    this.ts = dayjs.unix(ts);
    this.updatedTs = typeof updatedTs === 'number' ? dayjs.unix(updatedTs) : undefined;
    this.user = user;
    this.window = window;
    this.status = status;

    makeObservable(this, {
      body: observable,
      updatedTs: observable,
      status: observable,
      edited: computed,
      deleted: computed,
      createdTime: computed,
      updatedTime: computed,
      updatedDate: computed,
      updatedDateLong: computed,
      nick: computed,
      avatarUrl: computed,
      isMessageFromUser: computed,
      isChannelAction: computed,
      isBanner: computed,
      isServerNote: computed,
      isInfo: computed,
      isError: computed,
      channelAction: computed,
      bodyTokens: computed,
      images: computed,
      hasImages: computed,
      videos: computed,
      hasVideos: computed
    });
  }

  updateFromRecord(message: MessageRecord): void {
    this.body = message.body;
    this.status = message.status;
    this.updatedTs = typeof message.updatedTs === 'number' ? dayjs.unix(message.updatedTs) : this.updatedTs;
  }

  get edited(): boolean {
    return this.status === 'edited';
  }

  get deleted(): boolean {
    return this.status === 'deleted';
  }

  get createdTime(): string {
    return this.ts.format('HH:mm');
  }

  get updatedTime(): string {
    return this.updatedTs ? this.updatedTs.format(this.ts.isSame(this.updatedTs, 'd') ? 'HH:mm' : 'MMM Do HH:mm') : '';
  }

  get updatedDate(): string {
    const updatedTs = this.updatedTs;

    return updatedTs ? updatedTs.format('MMM Do HH:mm') : '';
  }

  get updatedDateLong(): string {
    const updatedTs = this.updatedTs;

    return updatedTs ? updatedTs.format('dddd, MMMM D HH:mm') : '';
  }

  get nick(): string | undefined {
    return this.user.nick[this.window.network];
  }

  get avatarUrl(): string {
    return `//gravatar.com/avatar/${this.user.gravatar}?d=mm`;
  }

  get fromMe(): boolean {
    return this.user === me;
  }

  get mentionsMe(): boolean {
    return this.bodyTokens.some(part => part.type === 'mention' && part.userId === me.id);
  }

  get isMessageFromUser(): boolean {
    return this.category === MessageCategory.Message;
  }

  get isChannelAction(): boolean {
    return [MessageCategory.Join, MessageCategory.Part, MessageCategory.Quit, MessageCategory.Kick].includes(
      this.category
    );
  }

  get isBanner(): boolean {
    return this.category === MessageCategory.Banner;
  }

  get isServerNote(): boolean {
    return this.category === MessageCategory.Server;
  }

  get isInfo(): boolean {
    return this.category === MessageCategory.Info;
  }

  get isError(): boolean {
    return this.category === MessageCategory.Error;
  }

  get channelAction(): { userId: string; nick: string; text?: string } {
    const nick = this.nick;
    const groupName = this.window.name;
    const body = this.body;

    const text: Record<string, string> = {
      join: `has joined ${groupName}.`,
      part: `has left ${groupName}. ${body}`,
      quit: `has quit irc. Reason: ${body}`,
      kick: `was kicked from ${groupName}. Reason: ${body}`
    };

    return { userId: this.user.id, nick: nick || 'unknown', text: text[this.category] };
  }

  get bodyTokens(): Array<BodyPart> {
    let parts: Array<BodyPart> = [{ type: 'text', text: this.body }];

    if (this.body !== '') {
      parts = this.extractLinks(parts);
      parts = this.extractEmojis(parts);

      if (this.category === MessageCategory.Message) {
        parts = this.extractImageAndVideoUrls(parts);
        parts = this.extractMentions(parts);
      }
    }

    return parts;
  }

  get images(): ImageUrlPart[] {
    return this.bodyTokens.filter(
      (part: BodyPart): part is ImageUrlPart => part.type === 'url' && part.class === UrlPartSubType.Image
    );
  }

  get hasImages(): boolean {
    return this.bodyTokens.some(part => part.type === 'url' && part.class === UrlPartSubType.Image);
  }

  get videos(): VideoUrlPart[] {
    return this.bodyTokens.filter(
      (part: BodyPart): part is VideoUrlPart => part.type === 'url' && part.class === UrlPartSubType.Video
    );
  }

  get hasVideos(): boolean {
    return this.bodyTokens.some(part => part.type === 'url' && part.class === UrlPartSubType.Video);
  }

  private extractLinks(parts: Array<BodyPart>): Array<BodyPart> {
    return parts.flatMap(part => {
      if (part.type === 'text') {
        let urlLocations: Array<number> = [];

        URI.withinString(part.text, (url, start, end) => {
          urlLocations.push(start, end);
          return url;
        });

        if (urlLocations.length === 0) {
          return part;
        }

        urlLocations = [0, ...urlLocations, part.text.length];
        const subParts: Array<BodyPart> = [];

        for (let i = 0; i < urlLocations.length - 1; i++) {
          const type = i % 2 === 0 ? 'text' : 'url';
          const sub = part.text.substring(urlLocations[i], urlLocations[i + 1]);

          if (type === 'text' && sub !== '') {
            subParts.push({ type, text: sub });
          } else if (type === 'url') {
            subParts.push({ type, url: new URI(sub), class: UrlPartSubType.Generic });
          }
        }

        return subParts;
      }

      return part;
    });
  }

  private extractEmojis(parts: Array<BodyPart>): Array<BodyPart> {
    return parts
      .flatMap(part => {
        if (part.type === 'text') {
          const subParts: Array<BodyPart> = [];

          part.text.split(EMOTICON_REGEX).forEach((emojiOrText, index) => {
            const maybeEmoticon = index % 2 === 1;
            const emoji = emoticons[emojiOrText.substring(1, emojiOrText.length - 1)];
            const isEmoticon = maybeEmoticon && emoji;

            if (isEmoticon) {
              subParts.push({ type: 'emoji', shortCode: emojiOrText, emoji, codePoint: this.emojiCodePoint(emoji) });
            } else if (emojiOrText !== '') {
              subParts.push({ type: 'text', text: emojiOrText });
            }
          });

          return subParts;
        }

        return part;
      })
      .flatMap(part => {
        if (part.type === 'text') {
          const subParts: Array<BodyPart> = [];

          part.text.split(EMOJI_REGEX).forEach((emojiOrText, index, parts) => {
            const isEmoji = parts.length > 1 && index % 2 === 1;

            if (isEmoji) {
              const shortCode = Object.keys(emoticons).find(key => emoticons[key] === emojiOrText);

              subParts.push({
                type: 'emoji',
                emoji: emojiOrText,
                ...(shortCode ? { shortCode: `:${shortCode}:` } : {}),
                codePoint: this.emojiCodePoint(emojiOrText)
              });
            } else if (emojiOrText !== '') {
              subParts.push({ type: 'text', text: emojiOrText });
            }
          });

          return subParts;
        }

        return part;
      });
  }

  private emojiCodePoint(emoji: string) {
    return emojiUnicode(emoji).split(' ').join('-');
  }

  private decodeYouTubeTimeParameter(url: URI): number {
    const startTimeParameter = url.search(true).t;
    const startTime = Array.isArray(startTimeParameter) ? startTimeParameter[0] : startTimeParameter;

    if (!startTime) {
      return 0;
    }

    // Try "2h32m1s" format
    const match = startTime.match(/^(?:(\d{1,2})h)?(?:(\d{1,2})m)?(?:(\d{1,2})s)?$/);

    if (match) {
      return parseInt(match[1] || '0') * 3600 + parseInt(match[2] || '0') * 60 + parseInt(match[3] || '0');
    }

    // Try plain seconds format
    return parseInt(startTime.match(/^(\d+)$/)?.[1] || '0');
  }

  private decodeYouTubeVideoId(url: URI): string | null {
    // Format is https://www.youtube.com/watch?v=0P7O69GuCII or https://youtu.be/0P7O69GuCII
    const parameter = url.search(true).v;

    return parameter
      ? Array.isArray(parameter)
        ? parameter[0]
        : parameter
      : url.pathname().substring(1).split('/')[0] || null;
  }

  private extractImageAndVideoUrls(parts: Array<BodyPart>): Array<BodyPart> {
    return parts.map(part => {
      if (part.type === 'url') {
        const url = part.url;
        const domain = url.domain();

        if (IMAGE_SUFFIXES.includes(url.suffix().toLowerCase())) {
          return { type: 'url', class: UrlPartSubType.Image, url: url };
        } else if ((domain === 'youtube.com' && url.search(true).v) || domain === 'youtu.be') {
          const videoId = this.decodeYouTubeVideoId(url);
          const startTime = this.decodeYouTubeTimeParameter(url);

          if (videoId) {
            return { type: 'url', class: UrlPartSubType.Video, url, startTime, videoId };
          } else {
            return part;
          }
        } else {
          return part;
        }
      }

      return part;
    });
  }

  private extractMentions(parts: Array<BodyPart>): Array<BodyPart> {
    return parts.flatMap(part => {
      if (part.type === 'text') {
        const subParts: Array<BodyPart> = [];
        const { text } = part;
        let subText = '';
        let i = 0;
        const ircMention = text.match(/^\S+:/)?.[0];

        if (ircMention) {
          const user = this.window.participants.get(ircMention.substring(0, ircMention.length - 1));
          if (user) {
            subParts.push({ type: 'mention', text: ircMention, userId: user.id });
            i += ircMention.length;
          }
        }

        while (i < text.length) {
          const char = text[i];

          if (char === '@') {
            const mention = text.substring(i)?.match(/@\S+/)?.[0];
            const user = mention && this.window.participants.get(mention.substring(1));

            if (mention && user) {
              subText.length > 0 && subParts.push({ type: 'text', text: subText });
              subParts.push({ type: 'mention', text: mention, userId: user.id });
              i += mention.length;
              subText = '';
              continue;
            }
          }

          i++;
          subText = subText + char;
        }

        subText.length > 0 && subParts.push({ type: 'text', text: subText });
        return subParts;
      }

      return part;
    });
  }
}
