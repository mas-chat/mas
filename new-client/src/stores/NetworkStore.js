import { observable, makeObservable } from 'mobx';
import { mandatory } from '../utils/parameters';

class NetworkStore {
  networks = [];

  constructor() {
    makeObservable(this, {
      networks: observable
    });
  }

  handleUpdateNetworksServer({ networks = mandatory() }) {
    this.networks = networks;
  }
}

export default new NetworkStore();
