import { observable, computed, makeObservable, action } from 'mobx';
import dayjs from 'dayjs';
import isMobile from 'ismobilejs';
import Message from '../models/Message';
import Window from '../models/Window';
import UserModel, { systemUser, me, ircSystemUser } from '../models/User';
import {
  Notification,
  MessageRecord,
  WindowRecord,
  UpdatableWindowRecord,
  Network,
  AlertsRecord,
  Role
} from '../types/notifications';
import WindowModel from '../models/Window';
import {
  CreateRequest,
  SendRequest,
  CommandRequest,
  JoinRequest,
  ChatRequest,
  FetchRequest,
  EditRequest,
  CloseRequest,
  UpdatePasswordRequest,
  UpdateTopicRequest,
  UpdateRequest,
  LogoutRequest,
  DestroyAccount
} from '../types/requests';
import RootStore from './RootStore';
import Socket from '../lib/socket';
import { logout } from '../lib/cookie';

let nextLocalGid = -1;

class WindowStore {
  rootStore: RootStore;
  socket: Socket;
  windows = new Map<number, Window>();

  cachedUpto = 0;

  initDone = false;

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      windows: observable,
      initDone: observable,
      desktops: computed,
      addWindow: action,
      finishStartup: action
    });
  }

  get desktops() {
    const desktops: { [key: number]: { initials: string; messages: number } } = {};

    this.windows.forEach(window => {
      const newMessages = window.newMessagesCount;
      const desktop = window.desktop;
      const initials = window?.simplifiedName?.substr(0, 2).toUpperCase() || window.windowId.toString();

      if (desktops[desktop]) {
        desktops[desktop].messages += newMessages;
      } else {
        desktops[desktop] = { messages: newMessages, initials };
      }
    });

    return Object.entries(desktops).map(([desktop, value]) => ({ ...value, id: parseInt(desktop) }));
  }

  handlerServerNotification(ntf: Notification): boolean {
    switch (ntf.type) {
      case 'ADD_MESSAGE': {
        const { type: _, windowId, ...message } = ntf;
        this.addMessage(windowId, message);
        break;
      }
      case 'ADD_MESSAGES': {
        ntf.messages.forEach(({ windowId, messages }: { windowId: number; messages: Array<MessageRecord> }) => {
          messages.forEach((message: MessageRecord) => {
            this.addMessage(windowId, message);
          });
        });
        break;
      }
      case 'ADD_WINDOW': {
        const { type: _, ...window } = ntf;
        this.addWindow(window);
        break;
      }
      case 'UPDATE_WINDOW': {
        const { type: _, ...window } = ntf;
        this.updateWindow(window);
        break;
      }
      case 'DELETE_WINDOW': {
        this.deleteWindow(ntf.windowId);
        break;
      }
      case 'FINISH_INIT': {
        this.finishStartup();
        break;
      }
      case 'UPDATE_MEMBERS': {
        this.updateMembers(ntf.windowId, ntf.members, ntf.reset);
        break;
      }
      case 'DELETE_MEMBERS': {
        this.deleteMembers(ntf.windowId, ntf.members);
        break;
      }
      default:
        return false;
    }

    return true;
  }

  async uploadFiles({ files, window }: { files: FileList; window: Window }) {
    if (files.length === 0) {
      return;
    }

    const formData = new FormData();
    const uploadedFiles = Array.from(files);

    for (const file of uploadedFiles) {
      formData.append('file', file, file.name || 'webcam-upload.jpg');
    }

    if (this.socket.sessionId) {
      formData.append('sessionId', this.socket.sessionId);
    }

    try {
      const response = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData
      });

      if (response.status < 300) {
        throw `Server error ${response.status}.`;
      }

      const { url } = await response.json();
      this.sendText(window, url.join(' '));
    } catch (e) {
      this.addError(window, 'File upload failed.');
    }
  }

  addMessage(windowId: number, messageRecord: MessageRecord) {
    const window = this.windows.get(windowId);

    if (!window) {
      return false;
    }

    const newMessage = this.upsertMessage(window, messageRecord, 'messages');

    if (newMessage) {
      if (messageRecord.cat === 'msg' || messageRecord.cat === 'action') {
        window.newMessagesCount++;
      }
    }
  }

  addError(window: WindowModel, body: string) {
    window.messages.set(
      nextLocalGid,
      new Message(nextLocalGid, body, 'error', dayjs().unix(), systemUser, window, 'original')
    );

    nextLocalGid--;
  }

  async sendText(window: WindowModel, text: string) {
    let sent = false;

    setTimeout(() => {
      if (!sent) {
        window.notDelivered = true;
      }
    }, 2500);

    const response = await this.socket.send<SendRequest>({
      id: 'SEND',
      text,
      windowId: window.windowId
    });

    sent = true;
    window.notDelivered = false;

    if (response.status !== 'OK') {
      this.rootStore.modalStore.openModal('info-modal', { title: 'Error', body: response.errorMsg });
    } else {
      const gid = response.gid as number;
      const ts = response.ts as number;

      window.messages.set(gid, new Message(gid, text, 'msg', ts, me, window, 'original'));
    }
  }

  async sendCommand(window: WindowModel, command: string, params?: string) {
    const response = await this.socket.send<CommandRequest>({
      id: 'COMMAND',
      command,
      params: params || '',
      windowId: window.windowId
    });

    if (response.status !== 'OK') {
      this.rootStore.modalStore.openModal('info-modal', { title: 'Error', body: response.errorMsg });
    }
  }

  async createGroup(name: string, password: string, acceptCb: () => void, rejectCb: (reason?: string) => void) {
    const response = await this.socket.send<CreateRequest>({ id: 'CREATE', name, password });

    if (response.status === 'OK') {
      acceptCb();
    } else {
      rejectCb(response.errorMsg);
    }
  }

  async joinGroup(name: string, password: string, acceptCb: () => void, rejectCb: (reason?: string) => void) {
    const response = await this.socket.send<JoinRequest>({
      id: 'JOIN',
      network: 'mas',
      name,
      password
    });

    if (response.status === 'OK') {
      acceptCb();
    } else {
      rejectCb(response.errorMsg);
    }
  }

  async joinIrcChannel(
    name: string,
    network: Network,
    password: string,
    acceptCb: () => void,
    rejectCb: (reason?: string) => void
  ) {
    const response = await this.socket.send<JoinRequest>({
      id: 'JOIN',
      name,
      network,
      password
    });

    if (response.status === 'OK') {
      acceptCb();
    } else {
      rejectCb(response.errorMsg);
    }
  }

  async startChat(userId: string, network: Network) {
    const response = await this.socket.send<ChatRequest>({
      id: 'CHAT',
      userId,
      network
    });

    if (response.status !== 'OK') {
      this.rootStore.modalStore.openModal('info-modal', {
        title: 'Error',
        body: response.errorMsg
      });
    }
  }

  async fetchMessageRange(window: WindowModel, start: number, end: number, successCb: () => void) {
    const response = await this.socket.send<FetchRequest>({
      id: 'FETCH',
      windowId: window.windowId,
      start,
      end
    });

    window.logMessages.clear();

    response.msgs.forEach(message => {
      this.upsertMessage(window, message, 'logMessages');
    });

    successCb();
  }

  async fetchOlderMessages(window: WindowModel, successCb: (success: boolean) => void) {
    const response = await this.socket.send<FetchRequest>({
      id: 'FETCH',
      windowId: window.windowId,
      end: Array.from(window.messages.values()).sort((a, b) => a.gid - b.gid)[0].ts,
      limit: 50
    });

    // Window messages are roughly sorted. First are old messages received by FETCH.
    // Then the messages received at startup and at runtime.
    if (!response.msgs) {
      successCb(false);
      return;
    }

    response.msgs.forEach(message => {
      this.upsertMessage(window, message, 'messages');
    });

    successCb(response.msgs.length !== 0);
  }

  processLine(window: WindowModel, body: string) {
    let command;
    let commandParams;

    if (body.charAt(0) === '/') {
      const parts = /^(\S*)(.*)/.exec(body.substring(1));
      command = parts && parts[1] ? parts[1].toLowerCase() : '';
      commandParams = (parts && parts[2] ? parts[2] : '').trim();
    }

    const ircServer1on1 = window.type === '1on1' && window.peerUser === ircSystemUser;

    if (ircServer1on1 && !command) {
      this.addError(window, 'Only commands allowed, e.g. /whois john');
      return;
    }

    if (command === 'help') {
      this.rootStore.modalStore.openModal('help-modal');
      return;
    }

    // TODO: /me on an empty IRC channel is not shown to the sender.

    if (command) {
      this.sendCommand(window, command, commandParams);
      return;
    }

    this.sendText(window, body);
  }

  async editMessage(window: WindowModel, gid: number, body: string) {
    const response = await this.socket.send<EditRequest>({
      id: 'EDIT',
      windowId: window.windowId,
      gid,
      text: body
    });

    if (response.status !== 'OK') {
      this.rootStore.modalStore.openPriorityModal('info-modal', {
        title: 'Error',
        body: response.errorMsg || ''
      });
    }
  }

  addWindow(windowRecord: WindowRecord) {
    const window = this.windows.get(windowRecord.windowId);
    const user = windowRecord.userId ? this.rootStore.userStore.users.get(windowRecord.userId) || null : null;

    if (window) {
      window.updateGeneration(this.socket.sessionId as string);
      window.updateFromRecord(windowRecord);
    } else {
      this.windows.set(
        windowRecord.windowId,
        new Window(
          windowRecord.windowId,
          user,
          windowRecord.network,
          windowRecord.windowType,
          this.socket.sessionId,
          windowRecord.topic,
          windowRecord.name,
          windowRecord.row,
          windowRecord.column,
          windowRecord.password,
          windowRecord.alerts,
          windowRecord.role
        )
      );
    }
  }

  updateWindow(windowRecord: UpdatableWindowRecord) {
    const window = this.windows.get(windowRecord.windowId);

    if (window) {
      window.updateFromRecord(windowRecord);
    }
  }

  async closeWindow(windowId: number) {
    await this.socket.send<CloseRequest>({
      id: 'CLOSE',
      windowId
    });
  }

  deleteWindow(windowId: number) {
    this.windows.delete(windowId);
  }

  async updatePassword(window: Window, password: string, successCb: () => void, rejectCb: (reason?: string) => void) {
    const response = await this.socket.send<UpdatePasswordRequest>({
      id: 'UPDATE_PASSWORD',
      windowId: window.windowId,
      password
    });

    if (response.status === 'OK') {
      successCb();
    } else {
      rejectCb(response.errorMsg);
    }
  }

  async updateTopic(window: Window, topic: string) {
    await this.socket.send<UpdateTopicRequest>({
      id: 'UPDATE_TOPIC',
      windowId: window.windowId,
      topic
    });
  }

  async updateWindowAlerts(window: Window, alerts: AlertsRecord) {
    window.alerts = alerts;

    await this.socket.send<UpdateRequest>({
      id: 'UPDATE',
      windowId: window.windowId,
      alerts
    });
  }

  async moveWindow(windowId: number, column: number, row: number, desktop: number) {
    const window = this.windows.get(windowId);

    if (!window) {
      return;
    }

    window.column = column;
    window.row = row;
    window.desktop = desktop;

    if (!isMobile().any) {
      await this.socket.send<UpdateRequest>({
        id: 'UPDATE',
        windowId,
        desktop,
        column,
        row
      });
    }
  }

  async handleToggleMemberListWidth(window: Window) {
    window.minimizedNamesList = !window.minimizedNamesList;

    await this.socket.send<UpdateRequest>({
      id: 'UPDATE',
      windowId: window.windowId,
      minimizedNamesList: window.minimizedNamesList
    });
  }

  seekActiveDesktop(direction: number): void {
    const desktops = this.desktops;
    const activeDesktopId = this.rootStore.settingStore.settings.activeDesktop;
    const activeDesktop = desktops.find(desktop => desktop.id === activeDesktopId);

    let index = activeDesktop && desktops.indexOf(activeDesktop);

    if (!index) {
      return;
    }

    index += direction;

    if (index === desktops.length) {
      index = 0;
    } else if (index < 0) {
      index = desktops.length - 1;
    }

    this.rootStore.settingStore.changeActiveDesktop(desktops[index].id);
  }

  finishStartup(): void {
    // Remove possible deleted windows.
    this.windows.forEach(windowObject => {
      if (windowObject.generation !== this.socket.sessionId) {
        this.windows.delete(windowObject.windowId);
      }
    });

    this.initDone = true;

    const validActiveDesktop = Array.from(this.windows.values()).some(
      window => window.desktop === this.rootStore.settingStore.settings.activeDesktop
    );

    if (!validActiveDesktop && this.windows.size > 0) {
      this.rootStore.settingStore.settings.activeDesktop = this.windows.values().next().value.desktop;
    }
  }

  updateMembers(windowId: number, members: Array<{ userId: string; role: Role }>, reset: boolean) {
    const window = this.windows.get(windowId);

    if (!window) {
      return;
    }

    if (reset) {
      window.operators = [];
      window.voices = [];
      window.users = [];
    }

    members.forEach(member => {
      const user = this.rootStore.userStore.users.get(member.userId);

      if (user) {
        if (!reset) {
          this.removeUser(user, window);
        }

        switch (member.role) {
          case '@':
          case '*':
            window.operators.push(user);
            break;
          case 'v':
            window.voices.push(user);
            break;
          default:
            window.users.push(user);
            break;
        }
      }
    });
  }

  deleteMembers(windowId: number, members: Array<{ userId: string }>) {
    const window = this.windows.get(windowId);

    if (!window) {
      return;
    }

    members.forEach(member => {
      const user = this.rootStore.userStore.users.get(member.userId);

      if (user) {
        this.removeUser(user, window);
      }
    });
  }

  // TODO: Move these handlers somewhere else

  async handleLogout(allSessions: boolean) {
    if (typeof Storage !== 'undefined') {
      window.localStorage.removeItem('data');
    }

    await this.socket.send<LogoutRequest>({
      id: 'LOGOUT',
      allSessions: !!allSessions
    });

    logout();
  }

  async handleDestroyAccount() {
    await this.socket.send<DestroyAccount>({
      id: 'DESTROY_ACCOUNT'
    });

    logout();
  }

  upsertMessage(window: WindowModel, message: MessageRecord, type: 'messages' | 'logMessages') {
    const existingMessage = window[type].get(message.gid);

    if (existingMessage) {
      existingMessage.updateFromRecord(message);
      return false;
    }

    const user = this.rootStore.userStore.users.get(message.userId);

    if (!user) {
      return true;
    }

    window[type].set(
      message.gid,
      new Message(message.gid, message.body, message.cat, message.ts, user, window, message.status, message.updatedTs)
    );

    return true;
  }

  private removeUser(user: UserModel, window: WindowModel) {
    window.operators = window.operators.filter(existingUser => user !== existingUser);
    window.voices = window.voices.filter(existingUser => user !== existingUser);
    window.users = window.users.filter(existingUser => user !== existingUser);
  }
}

export default WindowStore;
