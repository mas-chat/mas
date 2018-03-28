import Ember from 'ember';

let localStorageSupported = typeof Storage !== 'undefined';

export default Ember.Object.extend({
    _snapshotInterval: 60 * 1000, // 1 minute

    init() {
        if (localStorageSupported && this.toJSON && this.fromJSON) {
            this._loadSnapshot();

            setInterval(() => {
                Ember.run.next(this, this._saveSnapshot);
            }, this.get('_snapshotInterval'));
        }
    },

    _loadSnapshot() {
        let name = this.get('_storeName');
        let data;

        Ember.Logger.info(`[${name}-store] Starting to load saved snapshot.`);

        try {
            data = JSON.parse(window.localStorage.getItem(name));

            if (!data) {
                Ember.Logger.info(`[${name}-store] Snapshot not found.`);
                return false;
            }

            if (!data.version) {
                Ember.Logger.info(`[${name}-store] Snapshot corrupted, version property missing`);
                window.localStorage.removeItem('data');
                return false;
            }

            this.fromJSON(data)

            Ember.Logger.info('[${name}-store] Snapshot loaded and processed.');
        } catch (e) {
            Ember.Logger.info(`[${name}-store] Failed to load or validate snapshot, error: ${e}`);
        }
    },

    _saveSnapshot() {
        let name = this.get('_storeName');
        let data = this.toJSON();

        try {
            window.localStorage.setItem(name, JSON.stringify(data));
            Ember.Logger.info(`[${name}-store] Snapshot saved.`);
        } catch (e) {
            Ember.Logger.info(`[${name}-store] Failed to save snapshot, error: ${e}`);
        }
    }
});
