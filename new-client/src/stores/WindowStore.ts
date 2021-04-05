import { autorun, observable, computed, makeObservable, action, runInAction } from 'mobx';
import dayjs from 'dayjs';
import Message from '../models/Message';
import Window, { WindowMoveDirection } from '../models/Window';
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
import { rootUrl, welcomeUrl, windowUrl } from '../lib/urls';
import MessageModel from '../models/Message';

let nextLocalGid = -1;

const soundAlertElement = new Audio('staple_gun.mp3');
const DesktopNotification = window.Notification;

class WindowStore {
  rootStore: RootStore;
  socket: Socket;
  windows = new Map<number, Window>();
  activeWindow: Window | null = null;
  windowMoveStartingPoint: Array<{ window: Window; desktopId: number; row: number; column: number }> | null = null;
  navigateToPath: { ts: number; path?: string } = { ts: 0 };

  cachedUpto = 0;

  initDone = false;

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      windows: observable,
      activeWindow: observable,
      navigateToPath: observable,
      initDone: observable,
      desktops: computed,
      windowsArray: computed,
      visibleWindowsGrid: computed,
      windowMoveInProgress: computed,
      totalUnreadMessages: computed,
      addWindow: action,
      updateWindow: action,
      deleteWindowById: action,
      addMessage: action,
      closeWindow: action,
      addError: action,
      sendText: action,
      finishStartup: action,
      handleToggleShowMemberList: action,
      changeActiveWindowById: action,
      updateWindowAlerts: action,
      navigateTo: action,
      removeUser: action,
      startWindowMove: action,
      cancelWindowMove: action,
      saveWindowMove: action,
      moveWindow: action,
      moveWindowToDesktop: action
    });

    autorun(() => {
      this.initDone && setUnreadMessageCountBadge(this.totalUnreadMessages);
    });
  }

  get desktops(): { id: number; name: string; windows: Window[] }[] {
    const desktops: { [key: number]: { windows: Window[] } } = {};

    this.windows.forEach(window => {
      const { desktopId } = window;
      desktops[desktopId] = desktops[desktopId] ?? { windows: [] };
      desktops[desktopId].windows.push(window);
    });

    return Object.entries(desktops).map(([desktopId, value], index) => ({
      id: parseInt(desktopId),
      windows: value.windows,
      name: `Desktop #${index}`
    }));
  }

  get windowsArray(): Array<Window> {
    return Array.from(this.windows.values());
  }

  get visibleWindowsGrid(): Array<Array<Window>> {
    const activeWindow = this.activeWindow;

    if (!activeWindow) {
      return [];
    }

    const visibleWindows = this.windowsArray.filter(window => window.desktopId === activeWindow.desktopId);
    const rows = [...new Set(visibleWindows.map(window => window.row))].sort();

    return rows.map(row =>
      visibleWindows.filter(window => window.row === row).sort((a: Window, b: Window) => (a.column > b.column ? 1 : -1))
    );
  }

  get windowMoveInProgress(): boolean {
    return !!this.windowMoveStartingPoint;
  }

  get totalUnreadMessages(): number {
    let unreadMessages = 0;

    this.windows.forEach(window => {
      unreadMessages += window.unreadMessageCount;
    });

    return unreadMessages;
  }

  get firstWindow(): Window | null {
    return this.windowsArray[0] || null;
  }

  get fallbackWindow(): Window | null {
    return (
      this.activeWindow || this.windows.get(this.rootStore.profileStore.settings.activeWindowId) || this.firstWindow
    );
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
        this.deleteWindowById(ntf.windowId);
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

  addError(window: WindowModel, body: string): void {
    this.addMessage(window.id, {
      gid: nextLocalGid,
      userId: systemUser.id,
      ts: dayjs().unix(),
      cat: MessageCategory.Error,
      body,
      status: MessageStatus.Original
    });

    nextLocalGid--;
  }

  addMessage(windowId: number, messageRecord: MessageRecord): void {
    const window = this.windows.get(windowId);

    if (!window) {
      return;
    }

    this.upsertMessage(window, messageRecord, 'messages');
    window.resetLastSeenGid({ onlyIfFocused: true });
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
      const timestamp = response.ts as number;

      runInAction(() => {
        this.addMessage(window.id, {
          gid,
          userId: me.id,
          ts: timestamp,
          cat: MessageCategory.Message,
          body: text,
          status: MessageStatus.Original
        });
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

  async createGroup(name: string): Promise<{ success: boolean; errorMsg?: string }> {
    const response = await this.socket.send<CreateRequest>({ id: 'CREATE', name });
    const success = response.status === 'OK';

    return { success, ...(success ? {} : { errorMsg: response.errorMsg }) };
  }

  async joinGroup(name: string): Promise<{ success: boolean; errorMsg?: string }> {
    // TODO: Remove support for channel passwords in mas
    const response = await this.socket.send<JoinRequest>({
      id: 'JOIN',
      network: Network.Mas,
      name
    });
    const success = response.status === 'OK';

    return { success, ...(success ? {} : { errorMsg: response.errorMsg }) };
  }

  async joinIrcChannel(
    name: string,
    network: Network,
    password?: string
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

  async startChat(user: UserModel, network: Network): Promise<void> {
    const response = await this.socket.send<ChatRequest>({
      id: 'CHAT',
      userId: user.id,
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
      end: Array.from(window.messages.values()).sort((a, b) => a.gid - b.gid)[0].timestamp,
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

  async editMessage(message: MessageModel, body: string): Promise<void> {
    const response = await this.socket.send<EditRequest>({
      id: 'EDIT',
      windowId: message.window.id,
      gid: message.gid,
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

      this.initDone && this.navigateTo(windowUrl({ windowId: windowRecord.windowId }));
    }
  }

  updateWindow(windowRecord: UpdatableWindowRecord): void {
    const window = this.windows.get(windowRecord.windowId);

    if (window) {
      window.updateFromRecord(windowRecord);
    }
  }

  async closeWindow(closedWindow: Window): Promise<void> {
    await this.socket.send<CloseRequest>({
      id: 'CLOSE',
      windowId: closedWindow.id
    });
  }

  deleteWindowById(id: number): void {
    const deletedWindow = this.windows.get(id);

    this.windows.delete(id);

    if (this.activeWindow && this.activeWindow === deletedWindow) {
      const sameDesktopWindow = this.windowsArray.find(window => window.desktopId === deletedWindow?.desktopId);
      const windowId = sameDesktopWindow?.id || this.firstWindow?.id;

      this.navigateTo(windowId ? windowUrl({ windowId }) : welcomeUrl());
    }
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

  async updateTopic(window: Window, topic: string | null): Promise<void> {
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

  startWindowMove(): void {
    this.windowMoveStartingPoint = this.windowsArray.map(window => ({
      window,
      desktopId: window.desktopId,
      row: window.row,
      column: window.column
    }));
  }

  cancelWindowMove(): void {
    this.windowMoveStartingPoint?.forEach(entry => {
      const window = entry.window;

      window.desktopId = entry.desktopId;
      window.row = entry.row;
      window.column = entry.column;
    });

    this.windowMoveStartingPoint = null;
  }

  saveWindowMove(): void {
    this.windowsArray.forEach(window => {
      this.socket.send<UpdateRequest>({
        id: 'UPDATE',
        windowId: window.id,
        desktop: window.desktopId,
        column: window.column,
        row: window.row
      });
    });

    this.windowMoveStartingPoint = null;
  }

  moveWindow(movingWindow: Window, direction: WindowMoveDirection): void {
    const windowRowIndex = this.visibleWindowsGrid.findIndex(row => row.includes(movingWindow));
    const windowRow = this.visibleWindowsGrid[windowRowIndex];

    if (!windowRow) {
      return;
    }

    if (direction === WindowMoveDirection.Left || direction === WindowMoveDirection.Right) {
      this.moveInArray(movingWindow, windowRow, direction).forEach((window, index) => {
        window.column = index;
      });
      return;
    }

    if (windowRow.length === 1) {
      if (
        (direction === WindowMoveDirection.Up && windowRowIndex === 0) ||
        (direction === WindowMoveDirection.Down && windowRowIndex === this.visibleWindowsGrid.length - 1)
      ) {
        return;
      }
    }

    movingWindow.row += direction === WindowMoveDirection.Up ? -1 : 1;
  }

  moveWindowToDesktop(movingWindow: Window, desktopId: number | 'new'): void {
    movingWindow.desktopId =
      desktopId === 'new' ? Math.max(...this.desktops.map(desktop => desktop.id)) + 1 : desktopId;
  }

  private moveInArray(
    window: Window,
    array: Array<Window>,
    direction: WindowMoveDirection.Left | WindowMoveDirection.Right
  ): Array<Window> {
    const index = array.indexOf(window);

    if (
      (index === 0 && direction === WindowMoveDirection.Left) ||
      (index === array.length - 1 && direction === WindowMoveDirection.Right)
    ) {
      return array;
    }

    const toIndex = index + (direction === WindowMoveDirection.Left ? -1 : 1);

    const current = array[toIndex];
    array[toIndex] = window;
    array[index] = current;

    return array;
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

    this.windows.forEach(window => window.resetLastSeenGid()); // TODO: In the future, last seen gid comes from server
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

  changeActiveWindowById(windowId: number): void {
    const newActiveWindow = this.windows.get(windowId);

    if (!newActiveWindow) {
      this.navigateTo(rootUrl());
    } else if (newActiveWindow !== this.activeWindow) {
      this.activeWindow?.setFocus(false);
      this.activeWindow = newActiveWindow;
      this.activeWindow.setFocus(true);

      this.rootStore.profileStore.changeActiveWindowId(newActiveWindow);
    }
  }

  navigateTo(path: string): void {
    this.navigateToPath = { ts: Date.now(), path };
  }

  private upsertMessage(window: WindowModel, message: MessageRecord, type: 'messages' | 'logMessages'): void {
    const existingMessage = window[type].get(message.gid);

    if (existingMessage) {
      existingMessage.updateFromRecord(message);
      return;
    }

    const user = this.rootStore.userStore.users.get(message.userId);
    const networkSystemUser = window.network === Network.Mas ? systemUser : ircSystemUser;

    const messageModel = new Message({
      user: user || networkSystemUser,
      window,
      gid: message.gid,
      body: message.body,
      category: message.cat,
      timestamp: message.ts,
      updatedTimestamp: message.updatedTs,
      status: message.status
    });

    window[type].set(message.gid, messageModel);

    this.newMessageAlert(window, messageModel);
  }

  private newMessageAlert(window: WindowModel, message: Message) {
    if (!message.isNotable || message.isFromMe || !this.initDone) {
      return;
    }

    if (window.alerts.sound) {
      soundAlertElement.pause();
      soundAlertElement.currentTime = 0;
      soundAlertElement.play().catch(e => {
        console.log(`Sound notification failed, reason: ${e}`);
      });
    }

    if (window.alerts.notification) {
      const notificationsSupported = typeof DesktopNotification === 'function';

      if (notificationsSupported && DesktopNotification.permission === 'granted') {
        const ntf = new DesktopNotification(`${message.nick} (${window.type})`, {
          body: message.body,
          icon: message.avatarUrl
        });

        ntf.onclick = () => this.navigateTo(windowUrl({ windowId: window.id }));
      }
    }

    if (window.alerts.title) {
      window.unreadMessageCount++;
    }
  }

  removeUser(user: UserModel, window: WindowModel): void {
    window.operators = window.operators.filter(existingUser => user !== existingUser);
    window.voices = window.voices.filter(existingUser => user !== existingUser);
    window.users = window.users.filter(existingUser => user !== existingUser);
  }

  private startTrackingVisibilityChanges(): void {
    document.addEventListener('visibilitychange', () => {
      this.activeWindow?.setFocus(document.visibilityState === 'visible');
    });
  }
}

export default WindowStore;
