import {
  AlertStore,
  FriendStore,
  ModalStore,
  NetworkStore,
  ProfileStore,
  StartupStore,
  UserStore,
  WindowStore
} from '.';
import { Notification } from '../types/notifications';
import Socket from '../lib/socket';

interface Store {
  handlerServerNotification(ntf: Notification): boolean;
}

class RootStore {
  alertStore: AlertStore;
  friendStore: FriendStore;
  modalStore: ModalStore;
  networkStore: NetworkStore;
  profileStore: ProfileStore;
  startupStore: StartupStore;
  userStore: UserStore;
  windowStore: WindowStore;

  stores: Array<Store>;

  constructor() {
    const socket = new Socket(this);

    this.alertStore = new AlertStore(this, socket);
    this.friendStore = new FriendStore(this, socket);
    this.modalStore = new ModalStore(this, socket);
    this.networkStore = new NetworkStore(this, socket);
    this.profileStore = new ProfileStore(this, socket);
    this.startupStore = new StartupStore(this, socket);
    this.userStore = new UserStore(this, socket);
    this.windowStore = new WindowStore(this, socket);

    this.stores = [
      this.alertStore,
      this.friendStore,
      this.modalStore,
      this.networkStore,
      this.profileStore,
      this.startupStore,
      this.userStore,
      this.windowStore
    ];
  }

  dispatch(ntf: Notification): void {
    let consumed = false;

    for (const store of Object.values(this.stores)) {
      if (store.handlerServerNotification(ntf)) {
        consumed = true;
      }
    }

    if (!consumed) {
      console.error(`No store handled action: ${ntf.type}`);
    }
  }
}

export default RootStore;
