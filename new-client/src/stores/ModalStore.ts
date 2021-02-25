import { observable, makeObservable, action } from 'mobx';
import RootStore from './RootStore';
import { Modal } from '../models/Modal';
import Socket from '../lib/socket';

class ModalStore {
  rootStore: RootStore;
  socket: Socket;
  modals: Array<Modal> = [];

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

  openModal(modal: Modal): void {
    this.modals.push(modal);
  }

  openPriorityModal(modal: Modal): void {
    // Show immediately
    this.modals.unshift(modal);
  }

  closeModal(): void {
    this.modals.shift();
  }
}

export default ModalStore;
