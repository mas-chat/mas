//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing,
//   software distributed under the License is distributed on an "AS
//   IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
//   express or implied.  See the License for the specific language
//   governing permissions and limitations under the License.
//

import Ember from 'ember';

let localStorageSupported = typeof Storage !== 'undefined';

export default Ember.Service.extend({
    init() {
        if (localStorageSupported) {
            setInterval(function() {
                Ember.run.next(this, this._saveSnapshot);
            }.bind(this), 60 * 1000); // Once in a minute
        }
    },

    _saveSnapshot() {
        if (!this.get('initDone')) {
            return;
        }

        let data = this.toJSON();

        try {
            window.localStorage.setItem('data', JSON.stringify(data));
            Ember.Logger.info('Snapshot saved.');
        } catch (e) {
            Ember.Logger.info(`Failed to save snapshot: ${e}`);
        }

        this.set('cachedUpto', cachedUpto);
    },

    _loadSnapshot() {
        let data;

        if (!localStorageSupported) {
            return;
        }

        Ember.Logger.info('Starting to load saved snapshot.');

        try {
            data = JSON.parse(window.localStorage.getItem('data'));

            if (!data) {
                Ember.Logger.info('Snapshot not found.');
                return false;
            }

            Ember.Logger.info('Snapshot loaded.');

            if (data.userId !== this.get('userId') || data.version !== 1) {
                Ember.Logger.info('Snapshot corrupted.');
                window.localStorage.removeItem('data');
                return false;
            }

            this.fromJSON(data)

            Ember.Logger.info('Snapshot processed.');
        } catch (e) {
            Ember.Logger.info(`Failed to load or validate snapshot: ${e}`);
        }
    }
});

