import { observable, makeObservable } from 'mobx';
import { mandatory } from '../utils/parameters';

class ModalStore {
  modals = [];

  constructor() {
    makeObservable(this, {
      modals: observable
    });
  }

  handleOpenModal({ name = mandatory(), model }) {
    this.modals.push({ name, model });
  }

  handleOpenPriorityModal({ name = mandatory(), model }) {
    // Show immediately
    this.modals.unshift({ name, model });
  }

  handleCloseModal() {
    this.modals.shift();
  }

  handleClosePriorityModal() {
    this.modals.shift();
  }
}

export default new ModalStore();
