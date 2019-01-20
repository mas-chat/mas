import { observable } from 'mobx';
import { mandatory } from '../utils/parameters';

class NetworkStore {
  @observable networks = [];

  handleUpdateNetworksServer({ networks = mandatory() }) {
    this.networks = networks;
  }
}

export default new NetworkStore();
