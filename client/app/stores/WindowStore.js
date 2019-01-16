import Mobx from 'mobx';
import moment from 'moment';
import Cookies from 'js-cookie';
import isMobile from 'ismobilejs';
import { dispatch } from '../utils/dispatcher';
import Message from '../models/Message';
import Window from '../models/Window';
import settingStore from './SettingStore';
import userStore from './UserStore';
import socket from '../utils/socket';
import { calcMsgHistorySize } from '../utils/msg-history-sizer';
import { mandatory } from '../utils/parameters';

const { observable, computed } = Mobx;

class WindowStore {
  @observable windows = new Map();
  msgBuffer = []; // Only used during startup
  maxBacklogMsgs = 100000;
  cachedUpto = 0;
  @observable initDone = false;

  @computed
  get desktops() {
    const desktops = {};
    const desktopsArray = [];

    this.windows.forEach(window => {
      const newMessages = window.newMessagesCount;
      const desktop = window.desktop;
      const initials = window.simplifiedName.substr(0, 2).toUpperCase();

      if (desktops[desktop]) {
        desktops[desktop].messages += newMessages;
      } else {
        desktops[desktop] = { messages: newMessages, initials };
      }
    });

    Object.keys(desktops).forEach(desktop => {
      desktopsArray.push({
        id: parseInt(desktop),
        initials: desktops[desktop].initials,
        messages: desktops[desktop].messages
      });
    });

    return desktopsArray;
  }

  handleUploadFiles({ files = mandatory(), window = mandatory() }) {
    if (files.length === 0) {
      return;
    }

    const formData = new FormData();
    const uploadedFiles = Array.from(files);

    for (const file of uploadedFiles) {
      formData.append('file', file, file.name || 'webcam-upload.jpg');
    }

    formData.append('sessionId', socket.sessionId);

    // eslint-disable-next-line no-undef
    $.ajax({
      url: '/api/v1/upload',
      type: 'POST',
      data: formData,
      dataType: 'json',
      processData: false,
      contentType: false,
      success: resp =>
        dispatch('SEND_TEXT', {
          text: resp.url.join(' '),
          window
        }),
      error: () =>
        dispatch('ADD_ERROR', {
          body: 'File upload failed.',
          window
        })
    });
  }

  handleAddMessage({ gid = mandatory(), ts = mandatory(), window = mandatory(), body = mandatory() }) {
    window.messages.set(gid, new Message(this, { body, cat: 'msg', userId: userStore.userId, ts, gid, window }));

    this._trimBacklog(window.messages);
    this._notifyLineAdded(window);
  }

  handleAddMessageServer({
    gid = mandatory(),
    userId = mandatory(),
    ts = mandatory(),
    windowId = mandatory(),
    cat = mandatory(),
    updatedTs,
    status,
    body
  }) {
    const window = this.windows.get(windowId);

    if (!window) {
      return false;
    }

    if (!this.initDone) {
      // Optimization: Avoid re-renders after every message
      this.msgBuffer.push({ gid, userId, ts, windowId, cat, body, updatedTs, status, window });
    } else {
      let message = window.messages.get(gid);

      if (!message) {
        message = new Message(this, {});
        window.messages.set(gid, message);
      }

      Object.assign(message, { gid, userId, ts, windowId, cat, body, updatedTs, status, window });

      this._trimBacklog(window.messages);
      this._notifyLineAdded(window);
    }

    return true;
  }

  handleAddMessagesServer({ messages = mandatory() }) {
    messages.forEach(({ windowId, messages: windowMessages }) => {
      const window = this.windows.get(windowId);

      if (window) {
        windowMessages.forEach(({ gid, userId, ts, cat, body, updatedTs, status }) => {
          let message = window.messages.get(gid);

          if (!message) {
            message = new Message(this, {});
            window.messages.set(gid, message);
          }

          Object.assign(message, { gid, userId, ts, windowId, cat, body, updatedTs, status, window });
        });

        this._trimBacklog(window.messages);
        this._notifyLineAdded(window);
      }
    });

    return true;
  }

  handleAddError({ window = mandatory(), body = mandatory() }) {
    // TODO: Not optimal to use error gid, there's never second error message
    window.messages.set(
      'error',
      new Message(this, {
        body,
        cat: 'error',
        userId: null,
        ts: moment().unix(),
        gid: 'error',
        window
      })
    );

    this._notifyLineAdded(window);
  }

  handleSendText({ window = mandatory(), text = mandatory() }) {
    let sent = false;

    setTimeout(() => {
      if (!sent) {
        window.notDelivered = true;
      }
    }, 2500);

    socket.send(
      {
        id: 'SEND',
        text,
        windowId: window.windowId
      },
      resp => {
        sent = true;
        window.notDelivered = false;

        if (resp.status !== 'OK') {
          dispatch('OPEN_MODAL', {
            name: 'info-modal',
            model: {
              title: 'Error',
              body: resp.errorMsg
            }
          });
        } else {
          dispatch('ADD_MESSAGE', {
            body: text,
            ts: resp.ts,
            gid: resp.gid,
            window
          });
        }
      }
    );
  }

  handleSendCommand({ window = mandatory(), command = mandatory(), params = mandatory() }) {
    socket.send(
      {
        id: 'COMMAND',
        command,
        params,
        windowId: window.windowId
      },
      resp => {
        if (resp.status !== 'OK') {
          dispatch('OPEN_MODAL', {
            name: 'info-modal',
            model: {
              title: 'Error',
              body: resp.errorMsg
            }
          });
        }
      }
    );
  }

  handleCreateGroup({ name = mandatory(), password, acceptCb = mandatory(), rejectCb = mandatory() }) {
    socket.send(
      {
        id: 'CREATE',
        name,
        password
      },
      resp => {
        if (resp.status === 'OK') {
          acceptCb();
        } else {
          rejectCb(resp.errorMsg);
        }
      }
    );
  }

  handleJoinGroup({ name = mandatory(), password, acceptCb = mandatory(), rejectCb = mandatory() }) {
    socket.send(
      {
        id: 'JOIN',
        network: 'MAS',
        name,
        password
      },
      resp => {
        if (resp.status === 'OK') {
          acceptCb();
        } else {
          rejectCb(resp.errorMsg);
        }
      }
    );
  }

  handleJoinIrcChannel({
    name = mandatory(),
    network = mandatory(),
    password,
    acceptCb = mandatory(),
    rejectCb = mandatory()
  }) {
    socket.send(
      {
        id: 'JOIN',
        name,
        network,
        password
      },
      resp => {
        if (resp.status === 'OK') {
          acceptCb();
        } else {
          rejectCb(resp.errorMsg);
        }
      }
    );
  }

  handleStartChat({ userId = mandatory(), network = mandatory() }) {
    socket.send(
      {
        id: 'CHAT',
        userId,
        network
      },
      resp => {
        if (resp.status !== 'OK') {
          dispatch('OPEN_MODAL', {
            name: 'info-modal',
            model: {
              title: 'Error',
              body: resp.errorMsg
            }
          });
        }
      }
    );
  }

  handleFetchMessageRange({ window = mandatory(), start = mandatory(), end = mandatory(), successCb = mandatory() }) {
    socket.send(
      {
        id: 'FETCH',
        windowId: window.windowId,
        start,
        end
      },
      resp => {
        window.logMessages.clear();

        resp.msgs.forEach(({ gid, userId, ts, cat, body, updatedTs, status }) => {
          window.logMessages.set(gid, new Message(this, { gid, userId, ts, cat, body, updatedTs, status, window }));
        });

        successCb();
      }
    );
  }

  handleFetchOlderMessages({ window = mandatory(), successCb = mandatory() }) {
    socket.send(
      {
        id: 'FETCH',
        windowId: window.windowId,
        end: Array.from(window.messages.values()).sort((a, b) => a.gid - b.gid)[0].ts,
        limit: 50
      },
      resp => {
        // Window messages are roughly sorted. First are old messages received by FETCH.
        // Then the messages received at startup and at runtime.
        if (!resp.msgs) {
          successCb(false);
          return;
        }

        resp.msgs.forEach(({ gid, userId, ts, cat, body, updatedTs, status }) => {
          window.messages.set(gid, new Message(this, { gid, userId, ts, cat, body, updatedTs, status, window }));
        });

        successCb(resp.msgs.length !== 0);
      }
    );
  }

  handleProcessLine({ window = mandatory(), body = mandatory() }) {
    let command = false;
    let commandParams;

    if (body.charAt(0) === '/') {
      const parts = /^(\S*)(.*)/.exec(body.substring(1));
      command = parts[1] ? parts[1].toLowerCase() : '';
      commandParams = parts[2] ? parts[2] : '';
    }

    const ircServer1on1 = window.type === '1on1' && window.userId === 'i0';

    if (ircServer1on1 && !command) {
      dispatch('ADD_ERROR', {
        body: 'Only commands allowed, e.g. /whois john',
        window
      });
      return;
    }

    if (command === 'help') {
      dispatch('OPEN_MODAL', { name: 'help-modal' });
      return;
    }

    // TODO: /me on an empty IRC channel is not shown to the sender.

    if (command) {
      dispatch('SEND_COMMAND', {
        command,
        params: commandParams.trim(),
        window
      });
      return;
    }

    dispatch('SEND_TEXT', {
      text: body,
      window
    });
  }

  handleEditMessage({ window = mandatory(), gid = mandatory(), body = mandatory() }) {
    socket.send(
      {
        id: 'EDIT',
        windowId: window.windowId,
        gid,
        text: body
      },
      resp => {
        if (resp.status !== 'OK') {
          dispatch('OPEN_MODAL', {
            name: 'info-modal',
            model: {
              title: 'Error',
              body: resp.errorMsg
            }
          });
        }
      }
    );
  }

  handleAddWindowServer({
    windowId = mandatory(),
    userId,
    network = mandatory(),
    windowType = mandatory(),
    name,
    topic,
    row = mandatory(),
    column = mandatory(),
    minimizedNamesList = mandatory(),
    password,
    alerts = mandatory(),
    desktop = mandatory()
  }) {
    let window = this.windows.get(windowId);

    if (!window) {
      window = new Window(this, {});
      this.windows.set(windowId, window);
    }

    Object.assign(window, {
      windowId,
      userId,
      network,
      type: windowType,
      name,
      topic,
      row,
      column,
      minimizedNamesList,
      password,
      alerts,
      desktop,
      generation: socket.sessionId
    });
  }

  handleUpdateWindowServer({
    windowId = mandatory(),
    userId,
    network,
    windowType,
    name,
    topic,
    row,
    column,
    minimizedNamesList,
    desktop,
    password,
    alerts
  }) {
    const window = this.windows.get(windowId);

    Object.assign(window, {
      ...(userId ? { userId } : {}),
      ...(network ? { network } : {}),
      ...(windowType ? { type: windowType } : {}),
      ...(name ? { name } : {}),
      ...(topic ? { topic } : {}),
      ...(Number.isInteger(column) ? { column } : {}),
      ...(Number.isInteger(row) ? { row } : {}),
      ...(Number.isInteger(desktop) ? { desktop } : {}),
      ...(typeof minimizedNamesList === 'boolean' ? { minimizedNamesList } : {}),
      ...(password ? { password } : {}),
      ...(alerts ? { alerts } : {})
    });
  }

  handleCloseWindow({ window = mandatory() }) {
    socket.send({
      id: 'CLOSE',
      windowId: window.windowId
    });
  }

  handleDeleteWindowServer({ windowId = mandatory() }) {
    this.windows.delete(windowId);
  }

  handleUpdatePassword({
    window = mandatory(),
    password = mandatory(),
    successCb = mandatory(),
    rejectCb = mandatory()
  }) {
    socket.send(
      {
        id: 'UPDATE_PASSWORD',
        windowId: window.windowId,
        password
      },
      resp => {
        if (resp.status === 'OK') {
          successCb();
        } else {
          rejectCb(resp.errorMsg);
        }
      }
    );
  }

  handleUpdateTopic({ window = mandatory(), topic = mandatory() }) {
    socket.send({
      id: 'UPDATE_TOPIC',
      windowId: window.windowId,
      topic
    });
  }

  handleUpdateWindowAlerts({ window = mandatory(), alerts = mandatory() }) {
    window.alerts = alerts;

    socket.send({
      id: 'UPDATE',
      windowId: window.windowId,
      alerts
    });
  }

  handleMoveWindow({ windowId = mandatory(), column, row, desktop }) {
    const window = this.windows.get(windowId);

    Object.assign(window, {
      ...(Number.isInteger(column) ? { column } : {}),
      ...(Number.isInteger(row) ? { row } : {}),
      ...(Number.isInteger(desktop) ? { desktop } : {})
    });

    if (!isMobile.any) {
      socket.send({
        id: 'UPDATE',
        windowId,
        desktop,
        column,
        row
      });
    }
  }

  handleToggleMemberListWidth({ window = mandatory() }) {
    window.minimizedNamesList = !window.minimizedNamesList;

    socket.send({
      id: 'UPDATE',
      windowId: window.windowId,
      minimizedNamesList: window.minimizedNamesList
    });
  }

  handleSeekActiveDesktop({ direction = mandatory() }) {
    const desktops = this.desktops;
    const activeDesktop = settingStore.settings.activeDesktop;
    let index = desktops.indexOf(desktops.find(desktop => desktop.id === activeDesktop));

    index += direction;

    if (index === desktops.length) {
      index = 0;
    } else if (index < 0) {
      index = desktops.length - 1;
    }

    dispatch('CHANGE_ACTIVE_DESKTOP', {
      desktopId: desktops[index].id
    });
  }

  handleFinishStartupServer() {
    // Remove possible deleted windows.
    this.windows.forEach(windowObject => {
      if (windowObject.generation !== socket.sessionId) {
        this.windows.delete(windowObject.windowId);
      }
    });

    // Insert buffered message in one go.
    console.log(`MsgBuffer processing started.`);

    for (let i = 0; i < this.msgBuffer.length; i++) {
      const item = this.msgBuffer[i];
      item.window.messages.set(item.gid, new Message(this, item));
    }

    this._notifyLineAdded(window);
    console.log(`MsgBuffer processing ended.`);

    this.msgBuffer = [];
    this.initDone = true;

    const validActiveDesktop = Array.from(this.windows.values()).some(
      window => window.desktop === settingStore.settings.activeDesktop
    );

    if (!validActiveDesktop && this.windows.size > 0) {
      settingStore.settings.activeDesktop = this.windows.values().next().value.desktop;
    }
  }

  handleAddMembersServer({ windowId = mandatory(), members = mandatory(), reset }) {
    const window = this.windows.get(windowId);

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
          window.operators.push(userId);
          break;
        case '+':
          window.voices.push(userId);
          break;
        default:
          window.users.push(userId);
          break;
      }
    });
  }

  handleDeleteMembersServer({ windowId = mandatory(), members = mandatory() }) {
    const window = this.windows.get(windowId);

    members.forEach(member => {
      this._removeUser(member.userId, window);
    });
  }

  // TODO: Move these handlers somewhere else

  handleLogout({ allSessions }) {
    Cookies.remove('mas', { path: '/' });

    if (typeof Storage !== 'undefined') {
      window.localStorage.removeItem('data');
    }

    socket.send(
      {
        id: 'LOGOUT',
        allSessions: !!allSessions
      },
      () => {
        window.location = '/';
      }
    );
  }

  handleDestroyAccount() {
    socket.send(
      {
        id: 'DESTROY_ACCOUNT'
      },
      () => {
        Cookies.remove('mas', { path: '/' });
        window.location = '/';
      }
    );
  }

  _removeUser(userId, window) {
    window.operators = window.operators.filter(existingUserId => userId !== existingUserId);
    window.voices = window.voices.filter(existingUserId => userId !== existingUserId);
    window.users = window.users.filter(existingUserId => userId !== existingUserId);
  }

  _trimBacklog(messages) {
    const limit = calcMsgHistorySize();
    const messageArray = Array.from(messages.values()).sort((a, b) => a.ts > b.ts);

    for (const message of messageArray) {
      if (messages.size > limit) {
        messages.delete(message.gid);
      } else {
        break;
      }
    }
  }

  _notifyLineAdded(window) {
    if (window.lineAddedCb) {
      window.lineAddedCb();
    }
  }
}

export default new WindowStore();
