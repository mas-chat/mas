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

export function dispatch(ntf: Notification): void {
  let consumed = false;

  const stores: Record<string, any> = {
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

  for (const store of Object.keys(stores)) {
    consumed = stores[store].handlerServerNotification(ntf);

    if (consumed) {
      break;
    }
  }

  if (!consumed) {
    console.error(`No store handled action: ${ntf.type}`);
  }
}
