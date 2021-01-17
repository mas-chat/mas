import { observable, makeObservable, action } from 'mobx';

class ModalStore {
  modals: Array<{ name: string; model: Record<string, any> }> = [];

  constructor() {
    makeObservable(this, {
      modals: observable,
      openModal: action,
      openPriorityModal: action,
      closeModal: action
    });
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

export default new ModalStore();
