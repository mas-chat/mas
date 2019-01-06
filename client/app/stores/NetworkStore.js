import Mobx from 'mobx';
import { mandatory } from '../utils/parameters';

const { observable } = Mobx;

class NetworkStore {
  @observable networks = [];

  handleUpdateNetworksServer({ networks = mandatory() }) {
    this.networks = networks;
  }
}

export default new NetworkStore();
