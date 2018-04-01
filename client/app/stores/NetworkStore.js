import Mobx from 'npm:mobx';

const { observable } = Mobx;

class NetworkStore {
  @observable networks = [];

  handleUpdateNetworksServer(data) {
    this.networks = data.networks;
  }
}

export default new NetworkStore();
