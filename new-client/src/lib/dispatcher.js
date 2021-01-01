import alertStore from '../stores/AlertStore';
import daySeparatorStore from '../stores/DaySeparatorStore';
import friendStore from '../stores/FriendStore';
import modalStore from '../stores/ModalStore';
import networkStore from '../stores/NetworkStore';
import profileStore from '../stores/ProfileStore';
import settingStore from '../stores/SettingStore';
import userStore from '../stores/UserStore';
import windowStore from '../stores/WindowStore';

const noopCb = () => { };
const capitalize = string => string[0].toUpperCase() + string.slice(1).toLowerCase();

export function dispatch(type, data = {}, acceptCb = noopCb, rejectCb = noopCb) {
  let consumed = false;
  const name = type
    .split('_')
    .map(capitalize)
    .join('');
  const handler = `handle${name}`;

  const stores = {
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
    const storeObj = stores[store];

    if (storeObj[handler]) {
      consumed = true;

      const noLog = storeObj[handler].call(storeObj, data, acceptCb, rejectCb);

      if (!noLog) {
        console.log(`[${store.name}-store] Consumed action ${type}.`);
      }
    }
  }

  if (!consumed) {
    console.error(`No store handled action: ${type}`);
  }
}
