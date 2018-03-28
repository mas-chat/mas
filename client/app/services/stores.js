
import Service from '@ember/service';
//import { getAllStores } from '../dispatcher';

export default Service.extend({
    init() {
        Object.keys(window.stores).forEach(storeName => {
            this.set(storeName, stores[storeName]);
        });
    }
});
