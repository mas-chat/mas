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

export enum UrlPartType {
  Text,
  Url,
  Emoji,
  Mention
}

export enum UrlPartSubType {
  Generic,
  Image,
  Video
}

export type TextPart = { type: UrlPartType.Text; text: string };
export type GenericUrlPart = { type: UrlPartType.Url; url: URI; class: UrlPartSubType.Generic };
export type ImageUrlPart = { type: UrlPartType.Url; url: URI; class: UrlPartSubType.Image };
export type VideoUrlPart = {
  type: UrlPartType.Url;
  url: URI;
  class: UrlPartSubType.Video;
  videoId: string;
  startTime: number;
};
export type UrlPart = GenericUrlPart | ImageUrlPart | VideoUrlPart;
export type EmojiPart = { type: UrlPartType.Emoji; shortCode?: string; emoji: string; codePoint: string };
export type MentionPart = { type: UrlPartType.Mention; text: string; userId: string };

type BodyPart = TextPart | GenericUrlPart | ImageUrlPart | VideoUrlPart | EmojiPart | MentionPart;

export type MessageModelProps = {
  gid: number;
  body?: string;
  category: MessageCategory;
  timestamp: number;
  updatedTimestamp?: number;
  user: UserModel;
  window: WindowModel;
  status: MessageStatus;
};

export default class MessageModel {
  public readonly gid: number;
  public body = '';
  private readonly category: MessageCategory;
  public readonly timestamp: number;
  public updatedTimestamp?: number;
  public readonly user: UserModel;
  public readonly window: WindowModel;
  public status: MessageStatus;

  constructor({ gid, body, category, timestamp, updatedTimestamp, user, window, status }: MessageModelProps) {
    this.gid = gid;
    this.body = body || '';
    this.category = category;
    this.timestamp = timestamp;
    this.updatedTimestamp = updatedTimestamp;
    this.user = user;
    this.window = window;
    this.status = status;

    makeObservable(this, {
      body: observable,
      updatedTimestamp: observable,
      status: observable,
      edited: computed,
      deleted: computed,
      createdAt: computed,
      updatedAt: computed,
      createdTime: computed,
      updatedTime: computed,
      updatedDateLong: computed,
      nick: computed,
      avatarUrl: computed,
      isMessageFromUser: computed,
      isChannelAction: computed,
      isFromMe: computed,
      isNotable: computed,
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
    this.updatedTimestamp = message.updatedTs ?? this.updatedTimestamp;
  }

  get edited(): boolean {
    return this.status === 'edited';
  }

  get deleted(): boolean {
    return this.status === 'deleted';
  }

  get createdAt(): Dayjs {
    return dayjs.unix(this.timestamp);
  }

  get updatedAt(): Dayjs | undefined {
    return this.updatedTimestamp ? dayjs.unix(this.updatedTimestamp) : undefined;
  }

  get createdTime(): string {
    return this.createdAt.format('HH:mm');
  }

  get updatedTime(): string {
    if (!this.updatedAt) {
      return '';
    }

    return this.updatedAt.format(dayjs().isSame(this.updatedAt, 'd') ? 'HH:mm' : 'MMM D HH:mm');
  }

  get updatedDateLong(): string {
    if (!this.updatedAt) {
      return '';
    }

    return this.updatedAt.format('dddd, MMMM D HH:mm');
  }

  get nick(): string | undefined {
    return this.user.nick[this.window.network];
  }

  get avatarUrl(): string {
    return `//gravatar.com/avatar/${this.user.gravatar}?d=mm`;
  }

  get isFromMe(): boolean {
    return this.user === me;
  }

  get mentionsMe(): boolean {
    return this.bodyTokens.some(part => part.type === UrlPartType.Mention && part.userId === me.id);
  }

  get isMessageFromUser(): boolean {
    return this.category === MessageCategory.Message;
  }

  get isChannelAction(): boolean {
    return [MessageCategory.Join, MessageCategory.Part, MessageCategory.Quit, MessageCategory.Kick].includes(
      this.category
    );
  }

  get isNotable(): boolean {
    return [MessageCategory.Message, MessageCategory.Action].includes(this.category) && !this.isFromMe;
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
    let parts: Array<BodyPart> = [{ type: UrlPartType.Text, text: this.body }];

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
      (part: BodyPart): part is ImageUrlPart => part.type === UrlPartType.Url && part.class === UrlPartSubType.Image
    );
  }

  get hasImages(): boolean {
    return this.bodyTokens.some(part => part.type === UrlPartType.Url && part.class === UrlPartSubType.Image);
  }

  get videos(): VideoUrlPart[] {
    return this.bodyTokens.filter(
      (part: BodyPart): part is VideoUrlPart => part.type === UrlPartType.Url && part.class === UrlPartSubType.Video
    );
  }

  get hasVideos(): boolean {
    return this.bodyTokens.some(part => part.type === UrlPartType.Url && part.class === UrlPartSubType.Video);
  }

  private extractLinks(parts: Array<BodyPart>): Array<BodyPart> {
    return parts.flatMap(part => {
      if (part.type === UrlPartType.Text) {
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
          const type = i % 2 === 0 ? UrlPartType.Text : UrlPartType.Url;
          const sub = part.text.substring(urlLocations[i], urlLocations[i + 1]);

          if (type === UrlPartType.Text && sub !== '') {
            subParts.push({ type, text: sub });
          } else if (type === UrlPartType.Url) {
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
        if (part.type === UrlPartType.Text) {
          const subParts: Array<BodyPart> = [];

          part.text.split(EMOTICON_REGEX).forEach((emojiOrText, index) => {
            const maybeEmoticon = index % 2 === 1;
            const emoji = emoticons[emojiOrText.substring(1, emojiOrText.length - 1)];
            const isEmoticon = maybeEmoticon && emoji;

            if (isEmoticon) {
              subParts.push({
                type: UrlPartType.Emoji,
                shortCode: emojiOrText,
                emoji,
                codePoint: this.emojiCodePoint(emoji)
              });
            } else if (emojiOrText !== '') {
              subParts.push({ type: UrlPartType.Text, text: emojiOrText });
            }
          });

          return subParts;
        }

        return part;
      })
      .flatMap(part => {
        if (part.type === UrlPartType.Text) {
          const subParts: Array<BodyPart> = [];

          part.text.split(EMOJI_REGEX).forEach((emojiOrText, index, parts) => {
            const isEmoji = parts.length > 1 && index % 2 === 1;

            if (isEmoji) {
              const shortCode = Object.keys(emoticons).find(key => emoticons[key] === emojiOrText);

              subParts.push({
                type: UrlPartType.Emoji,
                emoji: emojiOrText,
                ...(shortCode ? { shortCode: `:${shortCode}:` } : {}),
                codePoint: this.emojiCodePoint(emojiOrText)
              });
            } else if (emojiOrText !== '') {
              subParts.push({ type: UrlPartType.Text, text: emojiOrText });
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
    const startTimeParameter = url.search(true)['t'];
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
    const parameter = url.search(true)['v'];

    return parameter
      ? Array.isArray(parameter)
        ? parameter[0]
        : parameter
      : url.pathname().substring(1).split('/')[0] || null;
  }

  private extractImageAndVideoUrls(parts: Array<BodyPart>): Array<BodyPart> {
    return parts.map(part => {
      if (part.type === UrlPartType.Url) {
        const url = part.url;
        const domain = url.domain();

        if (IMAGE_SUFFIXES.includes(url.suffix().toLowerCase())) {
          return { type: UrlPartType.Url, class: UrlPartSubType.Image, url: url };
        } else if ((domain === 'youtube.com' && url.search(true)['v']) || domain === 'youtu.be') {
          const videoId = this.decodeYouTubeVideoId(url);
          const startTime = this.decodeYouTubeTimeParameter(url);

          if (videoId) {
            return { type: UrlPartType.Url, class: UrlPartSubType.Video, url, startTime, videoId };
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
      if (part.type === UrlPartType.Text) {
        const subParts: Array<BodyPart> = [];
        const { text } = part;
        let subText = '';
        let i = 0;
        const ircMention = text.match(/^\S+:/)?.[0];

        if (ircMention) {
          const user = this.window.participants.get(ircMention.substring(0, ircMention.length - 1));
          if (user) {
            subParts.push({ type: UrlPartType.Mention, text: ircMention, userId: user.id });
            i += ircMention.length;
          }
        }

        while (i < text.length) {
          const char = text[i];

          if (char === '@') {
            const mention = text.substring(i)?.match(/@\S+/)?.[0];
            const user = mention && this.window.participants.get(mention.substring(1));

            if (mention && user) {
              subText.length > 0 && subParts.push({ type: UrlPartType.Text, text: subText });
              subParts.push({ type: UrlPartType.Mention, text: mention, userId: user.id });
              i += mention.length;
              subText = '';
              continue;
            }
          }

          i++;
          subText = subText + char;
        }

        subText.length > 0 && subParts.push({ type: UrlPartType.Text, text: subText });
        return subParts;
      }

      return part;
    });
  }
}
