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

  handlerServerNotification() {
    return false;
  }

  openModal(name: string, model: Record<string, string | number | undefined> = {}) {
    this.modals.push({ name, model });
  }

  openPriorityModal(name: string, model: Record<string, string | number>) {
    // Show immediately
    this.modals.unshift({ name, model });
  }

  closeModal() {
    this.modals.shift();
  }
}

export default ModalStore;
