import io from 'socket.io-client';
import { userId, secret } from './credentials';
import log from './log';
import calcMsgHistorySize from './msg-history-sizer';

const ioSocket = io.connect(); // Start connection as early as possible.

// TODO: Remove _SERVER suffix eventually
const serverIdToEventMap = {
  ADDMEMBERS: 'ADD_MEMBERS_SERVER',
  ALERT: 'SHOW_ALERT_SERVER',
  CLOSE: 'DELETE_WINDOW_SERVER',
  CREATE: 'ADD_WINDOW_SERVER',
  DELMEMBERS: 'DELETE_MEMBERS_SERVER',
  FRIENDS: 'ADD_FRIENDS_SERVER',
  FRIENDSCONFIRM: 'CONFIRM_FRIENDS_SERVER',
  INITDONE: 'FINISH_STARTUP_SERVER',
  MSG: 'ADD_MESSAGE_SERVER',
  NETWORKS: 'UPDATE_NETWORKS_SERVER',
  SET: 'UPDATE_SETTINGS_SERVER',
  UPDATE: 'UPDATE_WINDOW_SERVER',
  USERS: 'ADD_USERS_SERVER'
};

class Socket {
  constructor() {
    this.sessionId = 0;
    this.connected = false;
    this.sendQueue = [];
    this.disconnectedTimer = null;
    this.maxBacklogMsgs = 0;
  }

  configure(store) {
    this.store = store;
  }

  start() {
    Socket._emitInit();

    ioSocket.on('initok', data => {
      this.connected = true;
      this.sessionId = data.sessionId;
      this.maxBacklogMsgs = data.maxBacklogMsgs;

      this._emitReq(); // In case there are items in sendQueue from previous session
    });

    ioSocket.on('terminate', () => {
      this._logout();
    });

    ioSocket.on('ntf', notification => {
      const type = notification.id;
      delete notification.id;

      if (type !== 'MSG') {
        log.info(`← NTF: ${type}`);
      }

      const event = serverIdToEventMap[type];

      if (event) {
        this.store.dispatch({ type: event, data: notification });
      } else {
        log.warn(`Unknown notification received: ${type}`);
      }
    });

    ioSocket.on('disconnect', () => {
      log.info('Socket.io connection lost.');

      this.connected = false;

      this.disconnectedTimer = setTimeout(() => {
        this.store.dispatch({
          type: 'OPEN_PRIORITY_MODAL',
          name: 'non-interactive-modal',
          model: {
            title: 'Connection error',
            body: 'Connection to server lost. Trying to reconnect…'
          }
        }); // TODO: Use action creator

        this.disconnectedTimer = null;
      }, 5000);
    });

    ioSocket.on('reconnect', () => {
      const timer = this.disconnectedTimer;

      if (timer) {
        clearTimeout(timer);
      } else {
        this.store.dispatch({ type: 'CLOSE_PRIORITY_MODAL' }); // TODO: Use action creator
      }

      this._emitInit();
    });
  }

  send(command, callback) {
    this.sendQueue.push({
      request: command,
      callback
    });

    if (this.sendQueue.length === 1 && this.connected) {
      this._emitReq();
    }
  }

  static _emitInit() {
    const maxBacklogMsgs = calcMsgHistorySize();

    ioSocket.emit('init', {
      clientName: 'web',
      clientOS: navigator.platform,
      userId,
      secret,
      maxBacklogMsgs,
      version: '1.0',
      cachedUpto: 0 // TODO: Implement local storage based caching
    });

    log.info(`→ INIT: cachedUpto: 0, maxBacklogMsgs: ${maxBacklogMsgs}`);
  }

  _emitReq() {
    if (this.sendQueue.length === 0) {
      return;
    }

    const req = this.sendQueue[0];

    ioSocket.emit('req', req.request, data => {
      if (req.callback) {
        log.info('← RESP');
        req.callback(data);
      }

      this.sendQueue.shift();
      this._emitReq();
    });

    log.info(`→ REQ: ${req.request.id}`);
  }
}

export default new Socket();
