import { next } from '@ember/runloop';
import EmberObject from '@ember/object';

let localStorageSupported = typeof Storage !== 'undefined';

export default EmberObject.extend({
    _snapshotInterval: 60 * 1000, // 1 minute

    init() {
        if (localStorageSupported && this.toJSON && this.fromJSON) {
            this._loadSnapshot();

            setInterval(() => {
                next(this, this._saveSnapshot);
            }, this.get('_snapshotInterval'));
        }
    },

    _loadSnapshot() {
        let name = this.get('_storeName');
        let data;

        console.log(`[${name}-store] Starting to load saved snapshot.`);

        try {
            data = JSON.parse(window.localStorage.getItem(name));

            if (!data) {
                console.log(`[${name}-store] Snapshot not found.`);
                return false;
            }

            if (!data.version) {
                console.log(`[${name}-store] Snapshot corrupted, version property missing`);
                window.localStorage.removeItem('data');
                return false;
            }

            this.fromJSON(data)

            console.log(`[${name}-store] Snapshot loaded and processed.`);
        } catch (e) {
            console.log(`[${name}-store] Failed to load or validate snapshot, error: ${e}`);
        }
    },

    _saveSnapshot() {
        let name = this.get('_storeName');
        let data = this.toJSON();

        try {
            window.localStorage.setItem(name, JSON.stringify(data));
            console.log(`[${name}-store] Snapshot saved.`);
        } catch (e) {
            console.log(`[${name}-store] Failed to save snapshot, error: ${e}`);
        }
    }
});
