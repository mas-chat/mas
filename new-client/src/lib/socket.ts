import io, { ManagerOptions } from 'socket.io-client';
import { Request, RequestReturn, Acknowledgement } from '../types/requests';
import { Notification } from '../types/notifications';
import { ModalType } from '../models/Modal';
import RootStore from '../stores/RootStore';
import { logout, getCookie, setCookie } from '../lib/cookie';

declare const config: { socketHost: string | false };

const socketIOOptions: Partial<ManagerOptions> = {
  transports: ['polling', 'websocket'] // TODO: Experiment websocket first
};

// Start the connection as early as possible.
const ioSocket = config.socketHost ? io(config.socketHost, socketIOOptions) : io(socketIOOptions);

class Socket {
  rootStore: RootStore;
  sessionId = '';
  maxBacklogMsgs = 100000;
  private connected = false;
  private sendQueue: Array<{
    request: Request;
    callback: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve: (value: any) => void;
      reject: () => void;
    };
  }> = [];
  private disconnectedTimer?: number;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    this.emitInit();

    ioSocket.on('initok', ({ sessionId, maxBacklogMsgs }: { sessionId: string; maxBacklogMsgs: number }) => {
      this.connected = true;

      this.sessionId = sessionId;
      this.maxBacklogMsgs = maxBacklogMsgs;

      // TODO: Delete oldest messages for windows that have more messages than
      // maxBacklogMsgs. They can be stale, when editing becomes possible.

      this.emitRequest(); // In case there are items in sendQueue from previous session
    });

    ioSocket.on('terminate', ({ code, reason }: { code: string; reason: string }) => {
      logout(`Server sent TERMINATE message: ${code} (${reason})`);
    });

    ioSocket.on('refresh_session', ({ refreshCookie }: { refreshCookie: string }) => {
      setCookie(refreshCookie);
      ioSocket.emit('refresh_done');
    });

    ioSocket.on('ntf', (notification: Notification) => {
      console.log(`← NTF: ${notification.type}`);
      this.rootStore.dispatch(notification);
    });

    ioSocket.on('disconnect', () => {
      console.log('Socket.io connection lost.');

      this.connected = false;

      this.disconnectedTimer = window.setTimeout(() => {
        this.rootStore.modalStore.openPriorityModal({
          type: ModalType.Info,
          title: 'Connection error',
          body: 'Connection to server lost. Trying to reconnect…',
          forced: true
        });

        this.disconnectedTimer = undefined;
      }, 5000);
    });

    ioSocket.io.on('reconnect', () => {
      console.log('Socket.io connection resumed.');

      const timer = this.disconnectedTimer;

      if (timer) {
        clearTimeout(timer);
      } else {
        this.rootStore.modalStore.closeModal();
      }

      this.emitInit();
    });
  }

  send<T extends Request>(request: T): Promise<RequestReturn<T>> {
    return new Promise((resolve, reject) => {
      this.sendQueue.push({ request, callback: { resolve, reject } });

      if (this.sendQueue.length === 1 && this.connected) {
        this.emitRequest();
      }
    });
  }

  private emitInit(): void {
    const maxBacklogMsgs = 120;

    ioSocket.emit('init', {
      clientName: 'web',
      clientOS: navigator.platform,
      cookie: getCookie(),
      version: '1.0',
      maxBacklogMsgs,
      cachedUpto: 0
    });

    console.log(`→ INIT: maxBacklogMsgs: ${maxBacklogMsgs}`);
  }

  private emitRequest() {
    if (this.sendQueue.length === 0) {
      return;
    }

    const req = this.sendQueue[0];

    ioSocket.emit('req', req.request, (data: Acknowledgement) => {
      if (req.callback) {
        console.log('← RESP');
        req.callback.resolve(data);
      }

      this.sendQueue.shift();
      this.emitRequest();
    });

    console.log(`→ REQ: ${req.request.id}`);
  }
}

export default Socket;
