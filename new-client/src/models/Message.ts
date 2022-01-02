import { computed, observable, makeObservable } from 'mobx';
import dayjs, { Dayjs } from 'dayjs';
import URI from 'urijs';
import WindowModel from './Window';
import UserModel, { me } from './User';
import { MessageCategory, MessageRecord, MessageStatus } from '../types/notifications';
import { RemirrorJSON } from 'remirror';

const IMAGE_SUFFIXES = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

export type MessageModelProps = {
  gid: number;
  body?: string;
  doc?: RemirrorJSON;
  category: MessageCategory;
  timestamp: number;
  updatedTimestamp?: number;
  user: UserModel;
  window: WindowModel;
  status: MessageStatus;
};

export type MessageImage = {
  url: URI;
};

export type MessageVideo = {
  url: URI;
  videoId: string;
  startTime: number;
};

export default class MessageModel {
  public readonly gid: number;
  public body = '';
  public doc?: RemirrorJSON;
  private readonly category: MessageCategory;
  public readonly timestamp: number;
  public updatedTimestamp?: number;
  public readonly user: UserModel;
  public readonly window: WindowModel;
  public status: MessageStatus;

  constructor({ gid, body, doc, category, timestamp, updatedTimestamp, user, window, status }: MessageModelProps) {
    this.gid = gid;
    this.body = body || '';
    this.doc = doc;
    this.category = category;
    this.timestamp = timestamp;
    this.updatedTimestamp = updatedTimestamp;
    this.user = user;
    this.window = window;
    this.status = status;

    makeObservable(this, {
      body: observable,
      doc: observable,
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
    let mentions = false;

    this.forEachDocNode((node: RemirrorJSON) => {
      node.marks?.forEach(mark => {
        if (typeof mark !== 'string' && mark.type === 'mention' && mark.attrs?.id === me.id) {
          mentions = true;
        }
      });
    });

    return mentions;
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

  get channelAction(): string {
    const groupName = this.window.name;
    const body = this.body;

    const text: Record<string, string> = {
      join: `has joined ${groupName}.`,
      part: `has left ${groupName}. ${body}`,
      quit: `has quit irc. Reason: ${body}`,
      kick: `was kicked from ${groupName}. Reason: ${body}`
    };

    return text[this.category];
  }

  get images(): MessageImage[] {
    const images: MessageImage[] = [];

    this.forEachDocNode((node: RemirrorJSON) => {
      node.marks?.forEach(mark => {
        if (typeof mark !== 'string' && mark.type === 'link' && mark.attrs?.href) {
          const url = new URI(mark.attrs.href as string);

          if (IMAGE_SUFFIXES.includes(url.suffix().toLowerCase())) {
            images.push({ url: new URI(mark.attrs.href as string) });
          }
        }
      });
    });

    return images;
  }

  get hasImages(): boolean {
    return this.images.length > 0;
  }

  get videos(): MessageVideo[] {
    const videos: MessageVideo[] = [];

    this.forEachDocNode((node: RemirrorJSON) => {
      node.marks?.forEach(mark => {
        if (typeof mark !== 'string' && mark.type === 'link' && mark.attrs?.href) {
          const url: URI = new URI(mark.attrs.href as string);
          const domain = url.domain();

          if ((domain === 'youtube.com' && url.search(true)['v']) || domain === 'youtu.be') {
            const videoId = this.decodeYouTubeVideoId(url);
            const startTime = this.decodeYouTubeTimeParameter(url);

            if (videoId) {
              videos.push({
                url: new URI(mark.attrs.href as string),
                startTime,
                videoId
              });
            }
          }
        }
      });
    });

    return videos;
  }

  get hasVideos(): boolean {
    return this.videos.length > 0;
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

  private forEachDocNode(callback: (node: RemirrorJSON) => void, doc?: RemirrorJSON): void {
    const currentDoc = doc || this.doc;

    if (!currentDoc) {
      return;
    }

    callback(currentDoc);

    currentDoc?.content?.forEach(child => this.forEachDocNode(callback, child));
  }
}
