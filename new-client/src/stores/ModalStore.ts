import { observable, makeObservable } from 'mobx';

class ModalStore {
  modals = [];

  constructor() {
    makeObservable(this, {
      modals: observable
    });
  }

  handleOpenModal({ name, model }) {
    this.modals.push({ name, model });
  }

  handleOpenPriorityModal({ name, model }) {
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
