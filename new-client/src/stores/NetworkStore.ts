import { observable, makeObservable } from 'mobx';

class NetworkStore {
  networks = [];

  constructor() {
    makeObservable(this, {
      networks: observable
    });
  }

  handleUpdateNetworksServer({ networks }) {
    this.networks = networks;
  }
}

export default new NetworkStore();
