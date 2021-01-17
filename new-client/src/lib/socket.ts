import io from 'socket.io-client';
import Cookies from 'js-cookie';
import { dispatch } from './dispatcher';
import { RequestReturn } from '../types/requests';
import { Notification } from '../types/notifications';
import modalStore from '../stores/ModalStore';

declare const config: { socketHost: string | false };

// Start the connection as early as possible.
const ioSocket = config.socketHost ? io.connect(config.socketHost) : io.connect();

class Socket {
  sessionId: string | null = null;

  maxBacklogMsgs = 100000;

  cookie = Cookies.get('mas');

  _connected = false;

  _sendQueue: Array<{ request: any; callback: any }> = [];

  _disconnectedTimer?: number;

  constructor() {
    if (!this.cookie) {
      console.error(`Session cookie not found or corrupted. Exiting.`);
      this._logout();
    }

    this._emitInit();

    ioSocket.on('initok', ({ sessionId, maxBacklogMsgs }: { sessionId: string; maxBacklogMsgs: number }) => {
      this._connected = true;

      this.sessionId = sessionId;
      this.maxBacklogMsgs = maxBacklogMsgs;

      // TODO: Delete oldest messages for windows that have more messages than
      // maxBacklogMsgs. They can be stale, when editing becomes possible.

      this._emitReq(); // In case there are items in sendQueue from previous session
    });

    ioSocket.on('terminate', () => this._logout());

    ioSocket.on('refresh_session', ({ refreshCookie }: { refreshCookie: string }) => {
      this.cookie = refreshCookie;
      Cookies.set('mas', refreshCookie, { expires: 7 });
      ioSocket.emit('refresh_done');
    });

    ioSocket.on('ntf', (notification: Notification) => {
      console.log(`← NTF: ${notification.type}`);
      dispatch(notification);
    });

    ioSocket.on('disconnect', () => {
      console.log('Socket.io connection lost.');

      this.sessionId = null;
      this._connected = false;

      this._disconnectedTimer = window.setTimeout(() => {
        modalStore.openPriorityModal('non-interactive-modal', {
          title: 'Connection error',
          body: 'Connection to server lost. Trying to reconnect…'
        });

        this._disconnectedTimer = undefined;
      }, 5000);
    });

    ioSocket.io.on('reconnect', () => {
      console.log('Socket.io connection resumed.');

      const timer = this._disconnectedTimer;

      if (timer) {
        clearTimeout(timer);
      } else {
        modalStore.closeModal();
      }

      this._emitInit();
    });
  }

  send<T>(request: T): Promise<RequestReturn<T>> {
    return new Promise((resolve, reject) => {
      this._sendQueue.push({ request, callback: { resolve, reject } });

      if (this._sendQueue.length === 1 && this._connected) {
        this._emitReq();
      }
    });
  }

  _emitInit() {
    const maxBacklogMsgs = 120;
    const cookie = this.cookie;

    ioSocket.emit('init', {
      clientName: 'web',
      clientOS: navigator.platform,
      cookie,
      version: '1.0',
      maxBacklogMsgs,
      cachedUpto: 0
    });

    console.log(`→ INIT: maxBacklogMsgs: ${maxBacklogMsgs}`);
  }

  _emitReq() {
    if (this._sendQueue.length === 0) {
      return;
    }

    const req = this._sendQueue[0];

    ioSocket.emit('req', req.request, (data: Record<string, any>) => {
      if (req.callback) {
        console.log('← RESP');
        req.callback.resolve(data);
      }

      this._sendQueue.shift();
      this._emitReq();
    });

    console.log(`→ REQ: ${req.request.id}`);
  }

  _logout() {
    Cookies.remove('mas', { path: '/' });
    window.location.pathname = '/';
  }
}

export default new Socket();
