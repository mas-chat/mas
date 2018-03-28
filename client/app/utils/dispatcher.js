const noopCb = () => {};

export function dispatch(type, data = {}, acceptCb = noopCb, rejectCb = noopCb) {
  let consumed = false;
  const name = type
    .split('_')
    .map(part => part.toLowerCase().capitalize())
    .join('');
  const handler = `handle${name}`;

  for (const store of Object.keys(window.stores)) {
    const storeObj = window.stores[store];

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
