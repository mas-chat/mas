import { autorun, observable, computed, makeObservable, action, runInAction } from 'mobx';
import dayjs from 'dayjs';
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
  Role,
  MessageCategory,
  MessageStatus
} from '../types/notifications';
import WindowModel from '../models/Window';
import { ModalType } from '../models/Modal';
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
  DestroyAccountRequest
} from '../types/requests';
import RootStore from './RootStore';
import Socket from '../lib/socket';
import { logout } from '../lib/cookie';
import { setUnreadMessageCountBadge } from '../lib/favicon';

let nextLocalGid = -1;

class WindowStore {
  rootStore: RootStore;
  socket: Socket;
  windows = new Map<number, Window>();
  activeWindow: Window | null = null;
  startupActiveWindow: Window | null = null;

  cachedUpto = 0;

  initDone = false;

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      windows: observable,
      activeWindow: observable,
      initDone: observable,
      desktops: computed,
      totalUnreadMessages: computed,
      addWindow: action,
      addMessage: action,
      addError: action,
      sendText: action,
      finishStartup: action,
      handleToggleShowMemberList: action,
      setActiveWindowFocus: action,
      setActiveWindowByIdWithFallback: action
    });

    autorun(() => {
      this.initDone && setUnreadMessageCountBadge(this.totalUnreadMessages);
    });
  }

  get desktops(): { id: number; windows: Window[] }[] {
    const desktops: { [key: number]: { windows: Window[] } } = {};

    this.windows.forEach(window => {
      const { desktopId } = window;

      if (desktops[desktopId]) {
        desktops[desktopId].windows.push(window);
      } else {
        desktops[desktopId] = { windows: [window] };
      }
    });

    return Object.entries(desktops).map(([desktop, value]) => ({ ...value, id: parseInt(desktop) }));
  }

  get totalUnreadMessages(): number {
    let unreadMessages = 0;

    this.windows.forEach(window => {
      unreadMessages += window.unreadMessageCount;
    });

    return unreadMessages;
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

  async uploadFiles(window: Window, files: File[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    const formData = new FormData();

    for (const file of files) {
      formData.append('file', file, file.name || 'web-upload.jpg');
    }

    if (this.socket.sessionId) {
      formData.append('sessionId', this.socket.sessionId);
    }

    try {
      const response = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw `Server error ${response.status}.`;
      }

      const { url } = await response.json();
      this.sendText(window, url.join(' '));
    } catch (e) {
      this.addError(window, 'File upload failed.');
    }
  }

  addMessage(windowId: number, messageRecord: MessageRecord): void {
    const window = this.windows.get(windowId);

    if (!window) {
      return;
    }

    this.upsertMessage(window, messageRecord, 'messages');
    window.resetLastSeenGid({ onlyIfFocused: true });
  }

  addError(window: WindowModel, body: string): void {
    window.messages.set(
      nextLocalGid,
      new Message({
        gid: nextLocalGid,
        body,
        category: MessageCategory.Error,
        ts: dayjs().unix(),
        user: systemUser,
        window,
        status: MessageStatus.Original
      })
    );

    nextLocalGid--;
  }

  async sendText(window: WindowModel, text: string): Promise<void> {
    let sent = false;

    setTimeout(() => {
      if (!sent) {
        window.notDelivered = true;
      }
    }, 2500);

    const response = await this.socket.send<SendRequest>({
      id: 'SEND',
      text,
      windowId: window.id
    });

    sent = true;
    window.notDelivered = false;

    if (response.status !== 'OK') {
      this.rootStore.modalStore.openModal({ type: ModalType.Info, title: 'Error', body: response.errorMsg as string });
    } else {
      const gid = response.gid as number;
      const ts = response.ts as number;

      runInAction(() => {
        window.messages.set(
          gid,
          new Message({
            gid,
            body: text,
            category: MessageCategory.Message,
            ts,
            user: me,
            window,
            status: MessageStatus.Original
          })
        );
      });
    }
  }

  async sendCommand(window: WindowModel, command: string, params?: string): Promise<void> {
    const response = await this.socket.send<CommandRequest>({
      id: 'COMMAND',
      command,
      params: params || '',
      windowId: window.id
    });

    if (response.status !== 'OK') {
      this.rootStore.modalStore.openModal({ type: ModalType.Info, title: 'Error', body: response.errorMsg as string });
    }
  }

  async createGroup(name: string, password: string): Promise<{ success: boolean; errorMsg?: string }> {
    const response = await this.socket.send<CreateRequest>({ id: 'CREATE', name, password });
    const success = response.status === 'OK';

    return { success, ...(success ? {} : { errorMsg: response.errorMsg }) };
  }

  async joinGroup(name: string, password: string): Promise<{ success: boolean; errorMsg?: string }> {
    const response = await this.socket.send<JoinRequest>({
      id: 'JOIN',
      network: Network.Mas,
      name,
      password
    });
    const success = response.status === 'OK';

    return { success, ...(success ? {} : { errorMsg: response.errorMsg }) };
  }

  async joinIrcChannel(
    name: string,
    network: Network,
    password: string
  ): Promise<{ success: boolean; errorMsg?: string }> {
    const response = await this.socket.send<JoinRequest>({
      id: 'JOIN',
      name,
      network,
      password
    });
    const success = response.status === 'OK';

    return { success, ...(success ? {} : { errorMsg: response.errorMsg }) };
  }

  async startChat(userId: string, network: Network): Promise<void> {
    const response = await this.socket.send<ChatRequest>({
      id: 'CHAT',
      userId,
      network
    });

    if (response.status !== 'OK') {
      this.rootStore.modalStore.openModal({ type: ModalType.Info, title: 'Error', body: response.errorMsg as string });
    }
  }

  async fetchMessageRange(window: WindowModel, start: number, end: number): Promise<void> {
    const response = await this.socket.send<FetchRequest>({
      id: 'FETCH',
      windowId: window.id,
      start,
      end
    });

    window.logMessages.clear();

    response.msgs.forEach(message => {
      this.upsertMessage(window, message, 'logMessages');
    });
  }

  async fetchOlderMessages(window: WindowModel): Promise<boolean> {
    const response = await this.socket.send<FetchRequest>({
      id: 'FETCH',
      windowId: window.id,
      end: Array.from(window.messages.values())
        .sort((a, b) => a.gid - b.gid)[0]
        .ts.unix(),
      limit: 50
    });

    // Window messages are roughly sorted. First are old messages received by FETCH.
    // Then the messages received at startup and at runtime.
    if (!response.msgs) {
      return false;
    }

    response.msgs.forEach(message => {
      this.upsertMessage(window, message, 'messages');
    });

    return response.msgs.length !== 0;
  }

  processLine(window: WindowModel, body: string): void {
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
      this.rootStore.modalStore.openModal({ type: ModalType.Help });
      return;
    }

    // TODO: /me on an empty IRC channel is not shown to the sender.

    if (command) {
      this.sendCommand(window, command, commandParams);
      return;
    }

    this.sendText(window, body);
  }

  async editMessage(window: WindowModel, gid: number, body: string): Promise<void> {
    const response = await this.socket.send<EditRequest>({
      id: 'EDIT',
      windowId: window.id,
      gid,
      text: body
    });

    if (response.status !== 'OK') {
      this.rootStore.modalStore.openPriorityModal({
        type: ModalType.Info,
        title: 'Error',
        body: response.errorMsg as string
      });
    }
  }

  addWindow(windowRecord: WindowRecord): void {
    const window = this.windows.get(windowRecord.windowId);
    const user = windowRecord.userId ? this.rootStore.userStore.users.get(windowRecord.userId) || undefined : undefined;

    if (window) {
      window.updateGeneration(this.socket.sessionId as string);
      window.updateFromRecord(windowRecord);
    } else {
      this.windows.set(
        windowRecord.windowId,
        new Window({
          id: windowRecord.windowId,
          peerUser: user,
          network: windowRecord.network,
          type: windowRecord.windowType,
          desktopId: windowRecord.desktop,
          generation: this.socket.sessionId,
          topic: windowRecord.topic,
          name: windowRecord.name,
          row: windowRecord.row,
          column: windowRecord.column,
          password: windowRecord.password,
          alerts: windowRecord.alerts,
          role: windowRecord.role,
          isMemberListVisible: !windowRecord.minimizedNamesList
        })
      );
    }
  }

  updateWindow(windowRecord: UpdatableWindowRecord): void {
    const window = this.windows.get(windowRecord.windowId);

    if (window) {
      window.updateFromRecord(windowRecord);
    }
  }

  async closeWindow(id: number): Promise<void> {
    await this.socket.send<CloseRequest>({
      id: 'CLOSE',
      windowId: id
    });
  }

  deleteWindow(id: number): void {
    this.windows.delete(id);
  }

  async updatePassword(window: Window, password: string): Promise<{ success: boolean; errorMsg?: string }> {
    const response = await this.socket.send<UpdatePasswordRequest>({
      id: 'UPDATE_PASSWORD',
      windowId: window.id,
      password
    });
    const success = response.status === 'OK';

    return { success, ...(success ? {} : { errorMsg: response.errorMsg }) };
  }

  async updateTopic(window: Window, topic: string): Promise<void> {
    await this.socket.send<UpdateTopicRequest>({
      id: 'UPDATE_TOPIC',
      windowId: window.id,
      topic
    });
  }

  async updateWindowAlerts(window: Window, alerts: AlertsRecord): Promise<void> {
    window.alerts = alerts;

    await this.socket.send<UpdateRequest>({
      id: 'UPDATE',
      windowId: window.id,
      alerts
    });
  }

  async moveWindow(id: number, column: number, row: number, desktopId: number): Promise<void> {
    const window = this.windows.get(id);

    if (!window) {
      return;
    }

    window.column = column;
    window.row = row;
    window.desktopId = desktopId;

    await this.socket.send<UpdateRequest>({
      id: 'UPDATE',
      windowId: id,
      desktop: desktopId,
      column,
      row
    });
  }

  async handleToggleShowMemberList(window: Window): Promise<void> {
    window.isMemberListVisible = !window.isMemberListVisible;

    await this.socket.send<UpdateRequest>({
      id: 'UPDATE',
      windowId: window.id,
      minimizedNamesList: !window.isMemberListVisible
    });
  }

  finishStartup(): void {
    // Remove possible deleted windows.
    this.windows.forEach(windowObject => {
      if (windowObject.generation !== this.socket.sessionId) {
        this.windows.delete(windowObject.id);
      }
    });

    const settings = this.rootStore.profileStore.settings;

    if (this.windows.size > 0) {
      this.startupActiveWindow = this.windows.get(settings.activeWindowId) || this.windows.values().next().value;
      this.windows.forEach(window => window.resetLastSeenGid()); // TODO: In the future, last seen gid comes from server
    }

    this.startTrackingVisibilityChanges();

    this.initDone = true;
  }

  updateMembers(id: number, members: Array<{ userId: string; role: Role }>, reset: boolean): void {
    const window = this.windows.get(id);

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

  deleteMembers(windowId: number, members: Array<{ userId: string }>): void {
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

  async handleLogout(allSessions: boolean): Promise<void> {
    if (typeof Storage !== 'undefined') {
      window.localStorage.removeItem('data');
    }

    await this.socket.send<LogoutRequest>({
      id: 'LOGOUT',
      allSessions: !!allSessions
    });

    logout('User logged out');
  }

  async handleDestroyAccount(): Promise<void> {
    await this.socket.send<DestroyAccountRequest>({
      id: 'DESTROY_ACCOUNT'
    });

    logout('User destroyed the account');
  }

  setActiveWindowByIdWithFallback(windowId: number | null): number | false {
    const foundWindow = windowId !== null && !isNaN(windowId) && this.windows.get(windowId);
    const fallbackWindow = foundWindow ? null : this.windows.values().next().value || null;
    const activeWindow = this.activeWindow;
    const newActiveWindow = foundWindow || fallbackWindow;

    if (activeWindow) {
      activeWindow.focused = false;
    }

    if (newActiveWindow) {
      newActiveWindow.focused = true;
      this.rootStore.profileStore.changeActiveWindowId(newActiveWindow.id);
    }

    this.activeWindow = newActiveWindow;

    return fallbackWindow ? fallbackWindow.id : false;
  }

  setActiveWindowFocus(isFocused: boolean): void {
    if (this.activeWindow) {
      this.activeWindow.focused = isFocused;
    }
  }

  private upsertMessage(window: WindowModel, message: MessageRecord, type: 'messages' | 'logMessages'): void {
    const existingMessage = window[type].get(message.gid);

    if (existingMessage) {
      existingMessage.updateFromRecord(message);
      return;
    }

    const user = this.rootStore.userStore.users.get(message.userId);

    if (user) {
      window[type].set(
        message.gid,
        new Message({
          gid: message.gid,
          body: message.body,
          category: message.cat,
          ts: message.ts,
          user,
          window,
          status: message.status,
          updatedTs: message.updatedTs
        })
      );
    }
  }

  private removeUser(user: UserModel, window: WindowModel) {
    window.operators = window.operators.filter(existingUser => user !== existingUser);
    window.voices = window.voices.filter(existingUser => user !== existingUser);
    window.users = window.users.filter(existingUser => user !== existingUser);
  }

  private startTrackingVisibilityChanges(): void {
    let currentVisibilityState: VisibilityState;

    document.addEventListener('visibilitychange', () => {
      const newVisibilityState = document.visibilityState;

      if (newVisibilityState === currentVisibilityState) {
        return; // Probably should never happen
      }

      this.setActiveWindowFocus(newVisibilityState === 'visible');

      currentVisibilityState = newVisibilityState;
    });
  }
}

export default WindowStore;
