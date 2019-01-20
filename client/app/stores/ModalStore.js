import { observable } from 'mobx';
import { mandatory } from '../utils/parameters';

class ModalStore {
  @observable modals = [];

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
