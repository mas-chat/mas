
import Ember from 'ember';

const noopCb = () => {};

export function dispatch(type, data = {}, acceptCb = noopCb, rejectCb = noopCb) {
    let consumed = false;
    let name = type.split('_').map(part => part.toLowerCase().capitalize()).join('');
    let handler = `handle${name}`;

    for (let store of Object.keys(window.stores)) {
        let storeObj = window.stores[store];

        if (storeObj[handler]) {
            consumed = true;

            let noLog = storeObj[handler].call(storeObj, data, acceptCb, rejectCb);

            if (!noLog) {
                Ember.Logger.info(`[${store.name}-store] Consumed action ${type}.`);
            }
        }
    }

    if (!consumed) {
        Ember.Logger.error(`No store handled action: ${type}`);
    }
}
