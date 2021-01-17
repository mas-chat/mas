import { observable, makeObservable, action } from 'mobx';
import { Notification } from '../types/notifications';

class NetworkStore {
  networks: Array<string> = [];

  constructor() {
    makeObservable(this, {
      networks: observable,
      updateNetworks: action
    });
  }

  handlerServerNotification(ntf: Notification): boolean {
    switch (ntf.type) {
      case 'UPDATE_NETWORKS':
        this.updateNetworks(ntf.networks);
        break;
      default:
        return false;
    }

    return true;
  }

  updateNetworks(networks: Array<string>) {
    this.networks = networks;
  }
}

export default new NetworkStore();
