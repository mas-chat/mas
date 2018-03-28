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

/* globals Map */

import { assert } from '@ember/debug';
import { A } from '@ember/array';
import ArrayProxy from '@ember/array/proxy';

export default ArrayProxy.extend({
  content: null,
  _lookupTable: null,

  index: '',
  factory: null,

  init() {
    this.set('content', A());
    this._super();

    this.set('_lookupTable', new Map());
  },

  upsertModel(object, mixin) {
    return this._upsertObjects([object], { prepend: false, mixin });
  },

  upsertModelPrepend(object, mixin) {
    return this._upsertObjects([object], { prepend: true, mixin });
  },

  upsertModels(objects, mixin) {
    return this._upsertObjects(objects, { prepend: false, mixin });
  },

  upsertModelsPrepend(objects, mixin) {
    return this._upsertObjects(objects, { prepend: true, mixin });
  },

  getByIndex(index) {
    return this.get('_lookupTable').get(index);
  },

  removeModel(model) {
    return this._removeModels([model]);
  },

  removeModels(models) {
    return this._removeModels(models);
  },

  clearModels() {
    this.get('_lookupTable').clear();
    return this.clear();
  },

  _upsertObjects(objects, options) {
    const primaryKeyName = this.get('index');
    let model;

    for (const object of objects) {
      const primaryKey = object[primaryKeyName];
      assert(`Primary key '${primaryKeyName}' must exist`, primaryKey !== undefined);

      const existingModel = this.get('_lookupTable').get(primaryKey);

      if (existingModel) {
        model = existingModel.setModelProperties(object);
      } else {
        model = this._createModel(object);
        this.get('_lookupTable').set(primaryKey, model);

        if (options.prepend) {
          this.unshiftObject(model);
        } else {
          this.pushObject(model);
        }
      }

      if (options.mixin) {
        for (const prop of Object.keys(options.mixin)) {
          model.set(prop, options.mixin[prop]);
        }
      }
    }

    return model; // Last model
  },

  _createModel(object) {
    const model = this.get('factory').create();
    model.setModelProperties(object); // Never set properties with create()

    return model;
  },

  _removeModels(models) {
    const primaryKeyName = this.get('index');

    for (const model of models) {
      const primaryKey = model && model.get && model.get(primaryKeyName);
      const found = this.get('_lookupTable').delete(primaryKey);

      if (found) {
        this.removeObject(model);
      }
    }
  }
});
