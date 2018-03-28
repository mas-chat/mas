
import Ember from 'ember';
//import { getAllStores } from '../dispatcher';

export default Ember.Service.extend({
    init() {
        Object.keys(window.stores).forEach(storeName => {
            this.set(storeName, stores[storeName]);
        });
    }
});
