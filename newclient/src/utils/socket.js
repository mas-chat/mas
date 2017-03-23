import io from 'socket.io-client';
import Cookies from 'js-cookie';
import log from './log';
import userInfo from './userInfo';
import calcMsgHistorySize from './msg-history-sizer';

const ioSocket = io.connect(); // Start connection as early as possible.

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

      Cookies.set('mas', data.refreshCookie, { expires: 7 });

      userInfo.userId = `m${data.userId}`;

      this._emitReq(); // In case there are items in sendQueue from previous session
    });

    ioSocket.on('terminate', () => {
      Cookies.remove('mas');
      window.location.assign('/');
    });

    ioSocket.on('ntf', notification => this.store.dispatch(notification));

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

  send(request) {
    const promise = new Promise((resolve, reject) => {
      this.sendQueue.push({ request, resolve, reject });

      if (this.sendQueue.length === 1 && this.connected) {
        this._emitReq();
      }
    });

    return promise;
  }


  static _emitInit() {
    const cookie = Cookies.get('mas'); // TODO: Abort if not found
    const maxBacklogMsgs = calcMsgHistorySize();

    ioSocket.emit('init', {
      cookie,
      maxBacklogMsgs,
      clientName: 'web',
      clientOS: navigator.platform,
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
      log.info('← RESP');
      req.resolve(data);
    });

    this.sendQueue.shift();
    this._emitReq();

    log.info(`→ REQ: ${req.request.id}`);
  }
}

export default new Socket();
