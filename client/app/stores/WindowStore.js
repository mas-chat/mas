import Mobx, { autorun } from 'mobx';
import moment from 'moment';
import Cookies from 'js-cookie';
import isMobile from 'ismobilejs';
import { dispatch } from '../utils/dispatcher';
import Window from '../legacy-models/window';
import settingStore from '../stores/SettingStore';
import socket from '../utils/socket';
import { calcMsgHistorySize } from '../utils/msg-history-sizer';

const { observable, computed } = Mobx;

class WindowStore {
  @observable windows = new Map();
  msgBuffer = []; // Only used during startup
  maxBacklogMsgs = 100000;
  cachedUpto = 0;
  @observable initDone = false;

  userId = null; // TODO: Re-factor (set from socket.js)

  @computed
  get desktops() {
    const desktops = {};
    const desktopsArray = [];

    console.log('computed desktops');

    this.windows.forEach(masWindow => {
      const newMessages = masWindow.newMessagesCount;
      const desktop = masWindow.desktop;
      const initials = masWindow.simplifiedName.substr(0, 2).toUpperCase();

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

  constructor() {
    autorun(() => {
      if (!this.initDone) {
        return;
      }

      const desktopIds = this.desktops.map(d => d.id);

      if (desktopIds.indexOf(settingStore.settings.activeDesktop) === -1) {
        dispatch('CHANGE_ACTIVE_DESKTOP', {
          desktop: this.desktops.map(d => d.id).sort()[0] // Oldest
        });
      }
    });
  }

  handleUploadFiles(data) {
    if (data.files.length === 0) {
      return;
    }

    const formData = new FormData();
    const files = Array.from(data.files);

    for (const file of files) {
      formData.append('file', file, file.name || 'webcam-upload.jpg');
    }

    formData.append('sessionId', socket.get('sessionId'));

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
          window: data.window
        }),
      error: () =>
        dispatch('ADD_ERROR', {
          body: 'File upload failed.',
          window: data.window
        })
    });
  }

  handleAddMessage(data) {
    data.window.messages.upsertModel({
      body: data.body,
      cat: 'msg',
      userId: this.userId,
      ts: data.ts,
      gid: data.gid,
      window: data.window
    });

    this._trimBacklog(data.window.messages);
  }

  handleAddMessageServer(data) {
    data.window = this.windows.get(data.windowId);

    if (!data.window) {
      return false;
    }

    delete window.windowId;

    if (!this.initDone) {
      // Optimization: Avoid re-renders after every message
      this.msgBuffer.push(data);
    } else {
      data.window.messages.upsertModel(data);
      this._trimBacklog(data.window.messages);
    }

    return true;
  }

  handleAddMessagesServer(data) {
    data.messages.forEach(windowMessages => {
      const windowObject = this.windows.get(windowMessages.windowId);

      if (windowObject) {
        windowMessages.messages.forEach(message => {
          message.window = windowObject;
        });

        windowObject.messages.upsertModels(windowMessages.messages);

        this._trimBacklog(windowObject.messages);
      }
    });

    return true;
  }

  handleAddError(data) {
    data.window.messages.upsertModel({
      body: data.body,
      cat: 'error',
      userId: null,
      ts: moment().unix(),
      gid: 'error', // TODO: Not optimal, there's never second error message
      window: data.window
    });
  }

  handleSendText(data) {
    let sent = false;

    setTimeout(() => {
      if (!sent) {
        data.window.set('notDelivered', true);
      }
    }, 2500);

    socket.send(
      {
        id: 'SEND',
        text: data.text,
        windowId: data.window.get('windowId')
      },
      resp => {
        sent = true;
        data.window.set('notDelivered', false);

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
            body: data.text,
            ts: resp.ts,
            gid: resp.gid,
            window: data.window
          });
        }
      }
    );
  }

  handleSendCommand(data) {
    socket.send(
      {
        id: 'COMMAND',
        command: data.command,
        params: data.params,
        windowId: data.window.get('windowId')
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

  handleCreateGroup(data, acceptCb, rejectCb) {
    socket.send(
      {
        id: 'CREATE',
        name: data.name,
        password: data.password
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

  handleJoinGroup(data, acceptCb, rejectCb) {
    socket.send(
      {
        id: 'JOIN',
        name: data.name,
        network: 'MAS',
        password: data.password
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

  handleJoinIrcChannel(data, acceptCb, rejectCb) {
    socket.send(
      {
        id: 'JOIN',
        name: data.name,
        network: data.network,
        password: data.password
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

  handleStartChat(data) {
    socket.send(
      {
        id: 'CHAT',
        userId: data.userId,
        network: data.network
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

  handleFetchMessageRange(data, successCb) {
    socket.send(
      {
        id: 'FETCH',
        windowId: data.window.get('windowId'),
        start: data.start,
        end: data.end
      },
      resp => {
        data.window.get('logMessages').clearModels();
        data.window.get('logMessages').upsertModels(resp.msgs.reverse(), {
          window: data.window
        });
        successCb();
      }
    );
  }

  handleFetchOlderMessages(data, successCb) {
    socket.send(
      {
        id: 'FETCH',
        windowId: data.window.get('windowId'),
        end: data.window
          .get('messages')
          .sortBy('gid')
          .get('firstObject')
          .get('ts'),
        limit: 50
      },
      resp => {
        // Window messages are roughly sorted. First are old messages received by FETCH.
        // Then the messages received at startup and at runtime.
        if (!resp.msgs) {
          successCb(false);
          return;
        }

        data.window.get('messages').upsertModelsPrepend(resp.msgs, { window: data.window });

        successCb(resp.msgs.length !== 0);
      }
    );
  }

  handleProcessLine(data) {
    const body = data.body;
    let command = false;
    let commandParams;

    if (body.charAt(0) === '/') {
      const parts = /^(\S*)(.*)/.exec(body.substring(1));
      command = parts[1] ? parts[1].toLowerCase() : '';
      commandParams = parts[2] ? parts[2] : '';
    }

    const ircServer1on1 = data.window.get('type') === '1on1' && data.window.get('userId') === 'i0';

    if (ircServer1on1 && !command) {
      dispatch('ADD_ERROR', {
        body: 'Only commands allowed, e.g. /whois john',
        window: data.window
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
        window: data.window
      });
      return;
    }

    dispatch('SEND_TEXT', {
      text: body,
      window: data.window
    });
  }

  handleEditMessage(data) {
    socket.send(
      {
        id: 'EDIT',
        windowId: data.window.get('windowId'),
        gid: data.gid,
        text: data.body
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

  handleAddWindowServer(data) {
    data.type = data.windowType;
    delete data.windowType;
    data.generation = socket.sessionId;

    const model = Window.create();
    model.setModelProperties(data);

    this.windows.set(data.windowId, model);
  }

  handleCloseWindow(data) {
    socket.send({
      id: 'CLOSE',
      windowId: data.window.get('windowId')
    });
  }

  handleUpdateWindowServer(data) {
    const window = this.windows.get(data.windowId);
    window.setModelProperties(data);
  }

  handleDeleteWindowServer(data) {
    this.windows.delete(data.windowId);
  }

  handleUpdatePassword(data, successCb, rejectCb) {
    socket.send(
      {
        id: 'UPDATE_PASSWORD',
        windowId: data.window.get('windowId'),
        password: data.password
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

  handleUpdateTopic(data) {
    socket.send({
      id: 'UPDATE_TOPIC',
      windowId: data.window.get('windowId'),
      topic: data.topic
    });
  }

  handleUpdateWindowAlerts(data) {
    data.window.set('alerts', data.alerts);

    socket.send({
      id: 'UPDATE',
      windowId: data.window.get('windowId'),
      alerts: data.alerts
    });
  }

  handleMoveWindow(data) {
    const props = ['column', 'row', 'desktop'];

    for (const prop of props) {
      if (Object.prototype.hasOwnProperty.call(data, prop)) {
        data.window.set(prop, data[prop]);
      }
    }

    if (!isMobile.any) {
      socket.send({
        id: 'UPDATE',
        windowId: data.window.get('windowId'),
        desktop: data.desktop,
        column: data.column,
        row: data.row
      });
    }
  }

  handleToggleMemberListWidth(data) {
    const newValue = data.window.toggleProperty('minimizedNamesList');

    socket.send({
      id: 'UPDATE',
      windowId: data.window.get('windowId'),
      minimizedNamesList: newValue
    });
  }

  handleSeekActiveDesktop(data) {
    const desktops = this.desktops;
    const activeDesktop = settingStore.settings.activeDesktop;
    let index = desktops.indexOf(desktops.findBy('id', activeDesktop));

    index += data.direction;

    if (index === desktops.length) {
      index = 0;
    } else if (index < 0) {
      index = desktops.length - 1;
    }

    dispatch('CHANGE_ACTIVE_DESKTOP', {
      desktop: desktops[index].id
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
      item.window.messages.upsertModel(item);
    }

    console.log(`MsgBuffer processing ended.`);

    this.msgBuffer = [];
    this.initDone = true;
  }

  handleAddMembersServer(data) {
    const window = this.windows.get(data.windowId);

    if (data.reset) {
      window.operators.clear();
      window.voices.clear();
      window.users.clear();
    }

    data.members.forEach(member => {
      const userId = member.userId;

      if (!data.reset) {
        this._removeUser(userId, window);
      }

      switch (member.role) {
        case '@':
          window.operators.pushObject(userId);
          break;
        case '+':
          window.voices.pushObject(userId);
          break;
        default:
          window.users.pushObject(userId);
          break;
      }
    });
  }

  handleDeleteMembersServer(data) {
    const window = this.windows.get(data.windowId);

    data.members.forEach(member => {
      this._removeUser(member.userId, window);
    });
  }

  // TODO: Move these handlers somewhere else

  handleLogout({ allSessions = false } = {}) {
    Cookies.remove('mas', { path: '/' });

    if (typeof Storage !== 'undefined') {
      window.localStorage.removeItem('data');
    }

    socket.send(
      {
        id: 'LOGOUT',
        allSessions
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
    window.operators.removeObject(userId);
    window.voices.removeObject(userId);
    window.users.removeObject(userId);
  }

  _trimBacklog(messages) {
    // Remove the oldest message if the optimal history is visible
    if (messages.get('length') > calcMsgHistorySize()) {
      messages.removeModel(messages.sortBy('gid')[0]);
    }
  }
}

export default new WindowStore();
