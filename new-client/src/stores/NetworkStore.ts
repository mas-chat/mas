import { observable, makeObservable, action } from 'mobx';
import { Notification } from '../types/notifications';
import RootStore from './RootStore';
import Socket from '../lib/socket';

class NetworkStore {
  rootStore: RootStore;
  socket: Socket;
  networks: Array<string> = [];

  constructor(rootStore: RootStore, socket: Socket) {
    this.rootStore = rootStore;
    this.socket = socket;

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

  updateNetworks(networks: Array<string>): void {
    this.networks = networks;
  }
}

export default NetworkStore;
