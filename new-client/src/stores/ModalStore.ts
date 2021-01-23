import { observable, makeObservable, action } from 'mobx';
import RootStore from './RootStore';
import Socket from '../lib/socket';

class ModalStore {
  rootStore: RootStore;
  socket: Socket;
  modals: Array<{ name: string; model: Record<string, any> }> = [];

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

    makeObservable(this, {
      modals: observable,
      openModal: action,
      openPriorityModal: action,
      closeModal: action
    });
  }

  handlerServerNotification(): boolean {
    return false;
  }

  openModal(name: string, model: Record<string, string | number | undefined> = {}): void {
    this.modals.push({ name, model });
  }

  openPriorityModal(name: string, model: Record<string, string | number>): void {
    // Show immediately
    this.modals.unshift({ name, model });
  }

  closeModal(): void {
    this.modals.shift();
  }
}

export default ModalStore;
