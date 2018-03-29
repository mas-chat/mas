import alertStore from '../stores/AlertStore';

const noopCb = () => {};

export function dispatch(type, data = {}, acceptCb = noopCb, rejectCb = noopCb) {
  let consumed = false;
  const name = type
    .split('_')
    .map(part => part.toLowerCase().capitalize())
    .join('');
  const handler = `handle${name}`;

  const stores = window.stores;

  stores.alerts = alertStore;

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
