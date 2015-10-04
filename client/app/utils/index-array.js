//
//   Copyright 2009-2015 Ilkka Oksanen <iao@iki.fi>
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
import Window from '../models/window';
import Message from '../models/message';
import Friend from '../models/friend';
import Alert from '../models/alert';

const indexName = Symbol('index');
const type = Symbol('type');
const lookupTable = Symbol('lookupTable');

// const primaryKeys = {
//     window: 'windowId',
//     message: 'gid',
//     logMessage: 'gid',
//     friend: 'userId',
//     alert: 'alertId'
// };

export default Ember.ArrayProxy.extend({
    content: Ember.A(),
    index: '',
    lookupTable: null,

    init() {
        this._super();
        this.set('lookupTable', new Map());
    },

    insertModels(models) {
        return this._insertObjects(models, { prepend: false });
    },

    upsertModel(model) {
        return this._upsert(model, { prepend: false });
    },

    upsertModelPrepend(model) {
        return this._upsert(model, { prepend: true});
    },

    removeModel(model) {
        return this.removeModels([ object ]);
    },

    removeModels(models) {
        let primaryKeyName = this.get('index');

        for (let model of models) {
            let primaryKey = model.get(primaryKeyName);
            this.get('lookupTable').delete(primaryKey);
        }

        return this.removeObjects(models);
    },

    clearModels() {
        this.get('lookupTable').clear();
        return this.clear();
    },

    _upsert(model, options) {
        let primaryKeyName = this.get('index');
        let primaryKey = model.get(primaryKeyName);

        let existingModel = this.get('lookupTable').get(primaryKey);

        if (existingModel) {
            existingModel.setModelProperties(model); // huhhah pojo vs factory model
        } else {
            this._insertObjects([ model ], options);
        }

        return model;
    },

    _insertObjects(models, options) {
        let primaryKeyName = this.get('index');

        for (let model of models) {
            let primaryKey = model.get(primaryKeyName);
            Ember.assert('Primary key must exist', primaryKey);

            this.get('lookupTable').set(primaryKey, model);
        }

        return options.prepend ? this.unshiftObjects(model) : this.pushObjects(model);
    }

    // _createModel(type, data, parent) {
    //     let object = modelNameMapping[type].create();
    //     object.setModelProperties(data); // Never set properties with create()

    //     // TBD: Add 'arrayName' parameter so that logMessage type and primary key can be removed.

    //     if (type === 'window' || type === 'message' || type === 'logMessage' || type === 'friend') {
    //         object.set('store', this);
    //     }

    //     if (type === 'message' || type === 'logMessage') {
    //         object.set('window', parent);
    //     }

    //     return object;
    // }
});
