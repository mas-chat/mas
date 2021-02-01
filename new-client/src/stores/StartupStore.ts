import { observable, makeObservable, action, computed } from 'mobx';
import RootStore from './RootStore';
import Socket from '../lib/socket';
import { Notification } from '../types/notifications';

class StartupStore {
  rootStore: RootStore;
  socket: Socket;
  startupNotifications?: number;
  receivedNotifications = 0;
  currentlyLoading = '';

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      startupNotifications: observable,
      receivedNotifications: observable,
      currentlyLoading: observable,
      progress: computed,
      updateStartup: action,
      updateMessage: action
    });
  }

  handlerServerNotification(ntf: Notification): boolean {
    switch (ntf.type) {
      case 'STARTUP_SEQUENCE':
        this.updateStartup(ntf.length);
        return true;
      default:
        this.updateMessage(ntf);
        return false;
    }
  }

  updateStartup(length: number): void {
    this.startupNotifications = length;
  }

  updateMessage(ntf: Notification): void {
    if (typeof this.startupNotifications !== 'undefined' && ntf.type !== 'ADD_USERS') {
      this.receivedNotifications++;
    }

    if (ntf.type === 'ADD_WINDOW') {
      this.currentlyLoading = ntf.name || '1-on-1';
    }
  }

  get progress(): number {
    if (!this.startupNotifications) {
      return 0;
    } else if (this.startupNotifications === 0) {
      return 100;
    }

    return Math.floor((this.receivedNotifications / this.startupNotifications) * 100);
  }
}

export default StartupStore;
