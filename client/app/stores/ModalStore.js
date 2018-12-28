import Mobx from 'mobx';

const { observable } = Mobx;

class ModalStore {
  @observable modals = [];

  handleOpenModal(data) {
    this.modals.push({
      name: data.name,
      model: data.model
    });
  }

  handleCloseModal() {
    this.modals.shift();
  }

  handleOpenPriorityModal(data) {
    this.modals.unshift({
      // Show immediately
      name: data.name,
      model: data.model
    });
  }

  handleClosePriorityModal() {
    this.modals.shift();
  }
}

export default new ModalStore();
