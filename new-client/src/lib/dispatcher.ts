import alertStore from '../stores/AlertStore';
import daySeparatorStore from '../stores/DaySeparatorStore';
import friendStore from '../stores/FriendStore';
import modalStore from '../stores/ModalStore';
import networkStore from '../stores/NetworkStore';
import profileStore from '../stores/ProfileStore';
import settingStore from '../stores/SettingStore';
import userStore from '../stores/UserStore';
import windowStore from '../stores/WindowStore';
import { Notification } from '../types/notifications';

interface Store {
  handlerServerNotification(ntf: Notification): boolean;
}

const stores: Record<string, Store> = {
  alerts: alertStore,
  daySeparator: daySeparatorStore,
  friend: friendStore,
  modal: modalStore,
  networks: networkStore,
  profile: profileStore,
  settings: settingStore,
  users: userStore,
  window: windowStore
};

export function dispatch(ntf: Notification): void {
  for (const store of Object.values(stores)) {
    if (store.handlerServerNotification(ntf)) {
      return;
    }
  }

  console.error(`No store handled action: ${ntf.type}`);
}
