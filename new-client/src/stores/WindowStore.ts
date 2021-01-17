import { observable, computed, makeObservable } from 'mobx';
import dayjs from 'dayjs';
import Cookies from 'js-cookie';
import isMobile from 'ismobilejs';
import Message from '../models/Message';
import Window from '../models/Window';
import settingStore from './SettingStore';
import userStore from './UserStore';
import modalStore from './ModalStore';
import socket from '../lib/socket';
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

let nextLocalGid = -1;

class WindowStore {
  windows = new Map<number, Window>();

  cachedUpto = 0;

  initDone = false;

  constructor() {
    makeObservable(this, {
      windows: observable,
      initDone: observable,
      desktops: computed
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

    if (socket.sessionId) {
      formData.append('sessionId', socket.sessionId);
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

    const newMessage = this.upsertMessage(window, messageRecord);

    if (newMessage) {
      if (!window.visible && (messageRecord.cat === 'msg' || messageRecord.cat === 'action')) {
        window.newMessagesCount++;
      }
    }
  }

  addError(window: WindowModel, body: string) {
    window.messages.set(
      nextLocalGid,
      new Message(nextLocalGid, body, 'error', dayjs().unix(), null, window, 'original')
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

    const response = await socket.send<SendRequest>({
      id: 'SEND',
      text,
      windowId: window.windowId
    });

    sent = true;
    window.notDelivered = false;

    if (response.status !== 'OK') {
      modalStore.openModal('info-modal', { title: 'Error', body: response.errorMsg });
    } else {
      this.upsertMessage(window, {
        body: text,
        cat: 'msg',
        userId: userStore.userId,
        ts: response.ts as number,
        gid: response.gid as number,
        status: 'original'
      });
    }
  }

  async sendCommand(window: WindowModel, command: string, params?: string) {
    const response = await socket.send<CommandRequest>({
      id: 'COMMAND',
      command,
      params: params || '',
      windowId: window.windowId
    });

    if (response.status !== 'OK') {
      modalStore.openModal('info-modal', { title: 'Error', body: response.errorMsg });
    }
  }

  async createGroup(name: string, password: string, acceptCb: () => void, rejectCb: (reason?: string) => void) {
    const response = await socket.send<CreateRequest>({ id: 'CREATE', name, password });

    if (response.status === 'OK') {
      acceptCb();
    } else {
      rejectCb(response.errorMsg);
    }
  }

  async joinGroup(name: string, password: string, acceptCb: () => void, rejectCb: (reason?: string) => void) {
    const response = await socket.send<JoinRequest>({
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
    const response = await socket.send<JoinRequest>({
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
    const response = await socket.send<ChatRequest>({
      id: 'CHAT',
      userId,
      network
    });

    if (response.status !== 'OK') {
      modalStore.openModal('info-modal', {
        title: 'Error',
        body: response.errorMsg
      });
    }
  }

  async fetchMessageRange(window: WindowModel, start: number, end: number, successCb: () => void) {
    const response = await socket.send<FetchRequest>({
      id: 'FETCH',
      windowId: window.windowId,
      start,
      end
    });

    window.logMessages.clear();

    response.msgs.forEach(({ gid, body, cat, ts, userId, status, updatedTs }: MessageRecord) => {
      window.logMessages.set(gid, new Message(gid, body, cat, ts, userId, window, status, updatedTs));
    });

    successCb();
  }

  async fetchOlderMessages(window: WindowModel, successCb: (success: boolean) => void) {
    const response = await socket.send<FetchRequest>({
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

    response.msgs.forEach(({ gid, userId, ts, cat, body, updatedTs, status }: MessageRecord) => {
      window.messages.set(gid, new Message(gid, body, cat, ts, userId, window, status, updatedTs));
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

    const ircServer1on1 = window.type === '1on1' && window.userId === 'i0';

    if (ircServer1on1 && !command) {
      this.addError(window, 'Only commands allowed, e.g. /whois john');
      return;
    }

    if (command === 'help') {
      modalStore.openModal('help-modal');
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
    const response = await socket.send<EditRequest>({
      id: 'EDIT',
      windowId: window.windowId,
      gid,
      text: body
    });

    if (response.status !== 'OK') {
      modalStore.openPriorityModal('info-modal', {
        title: 'Error',
        body: response.errorMsg || ''
      });
    }
  }

  addWindow(windowRecord: WindowRecord) {
    const window = this.windows.get(windowRecord.windowId);
    const windowProperties = {
      ...windowRecord,
      generation: socket.sessionId
    };

    if (window) {
      Object.assign(window, windowProperties);
    } else {
      this.windows.set(
        windowRecord.windowId,
        new Window(
          windowProperties.windowId,
          windowRecord.userId,
          windowRecord.network,
          windowRecord.windowType,
          windowRecord.topic,
          windowRecord.name,
          windowRecord.row,
          windowRecord.column,
          windowRecord.password,
          windowRecord.alerts
        )
      );
    }
  }

  updateWindow(windowRecord: UpdatableWindowRecord) {
    const window = this.windows.get(windowRecord.windowId);
    Object.assign(window, windowRecord);
  }

  async closeWindow(windowId: number) {
    await socket.send<CloseRequest>({
      id: 'CLOSE',
      windowId
    });
  }

  deleteWindow(windowId: number) {
    this.windows.delete(windowId);
  }

  async updatePassword(window: Window, password: string, successCb: () => void, rejectCb: (reason?: string) => void) {
    const response = await socket.send<UpdatePasswordRequest>({
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
    await socket.send<UpdateTopicRequest>({
      id: 'UPDATE_TOPIC',
      windowId: window.windowId,
      topic
    });
  }

  async updateWindowAlerts(window: Window, alerts: AlertsRecord) {
    window.alerts = alerts;

    await socket.send<UpdateRequest>({
      id: 'UPDATE',
      windowId: window.windowId,
      alerts
    });
  }

  async moveWindow(windowId: number, column: number, row: number, desktop: number) {
    const window = this.windows.get(windowId);

    Object.assign(window, { column, row, desktop });

    if (!isMobile().any) {
      await socket.send<UpdateRequest>({
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

    await socket.send<UpdateRequest>({
      id: 'UPDATE',
      windowId: window.windowId,
      minimizedNamesList: window.minimizedNamesList
    });
  }

  seekActiveDesktop(direction: number) {
    const desktops = this.desktops;
    const activeDesktopId = settingStore.settings.activeDesktop;
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

    settingStore.changeActiveDesktop(desktops[index].id);
  }

  finishStartup() {
    // Remove possible deleted windows.
    this.windows.forEach(windowObject => {
      if (windowObject.generation !== socket.sessionId) {
        this.windows.delete(windowObject.windowId);
      }
    });

    this.initDone = true;

    const validActiveDesktop = Array.from(this.windows.values()).some(
      window => window.desktop === settingStore.settings.activeDesktop
    );

    if (!validActiveDesktop && this.windows.size > 0) {
      settingStore.settings.activeDesktop = this.windows.values().next().value.desktop;
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
      const userId = member.userId;

      if (!reset) {
        this._removeUser(userId, window);
      }

      switch (member.role) {
        case '@':
        case '*':
          window.operators.push(userId);
          break;
        case 'v':
          window.voices.push(userId);
          break;
        default:
          window.users.push(userId);
          break;
      }
    });
  }

  deleteMembers(windowId: number, members: Array<{ userId: string }>) {
    const window = this.windows.get(windowId);

    if (!window) {
      return;
    }

    members.forEach(member => {
      this._removeUser(member.userId, window);
    });
  }

  // TODO: Move these handlers somewhere else

  async handleLogout(allSessions: boolean) {
    Cookies.remove('mas', { path: '/' });

    if (typeof Storage !== 'undefined') {
      window.localStorage.removeItem('data');
    }

    await socket.send<LogoutRequest>({
      id: 'LOGOUT',
      allSessions: !!allSessions
    });

    window.location.pathname = '/';
  }

  async handleDestroyAccount() {
    await socket.send<DestroyAccount>({
      id: 'DESTROY_ACCOUNT'
    });

    Cookies.remove('mas', { path: '/' });
    window.location.pathname = '/';
  }

  upsertMessage(window: WindowModel, message: MessageRecord) {
    const existingMessage = window.messages.get(message.gid);

    if (existingMessage) {
      Object.assign(existingMessage, message);
      return false;
    }

    window.messages.set(
      message.gid,
      new Message(
        message.gid,
        message.body,
        message.cat,
        message.ts,
        message.userId,
        window,
        message.status,
        message.updatedTs
      )
    );
    return true;
  }

  _removeUser(userId: string, window: WindowModel) {
    window.operators = window.operators.filter(existingUserId => userId !== existingUserId);
    window.voices = window.voices.filter(existingUserId => userId !== existingUserId);
    window.users = window.users.filter(existingUserId => userId !== existingUserId);
  }
}

export default new WindowStore();
