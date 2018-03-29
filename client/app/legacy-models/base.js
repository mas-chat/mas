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

import EmberObject from '@ember/object';

export default EmberObject.extend({
  setModelProperties(props) {
    // Support second level nested object simple properties

    for (const prop of Object.keys(props)) {
      const value = props[prop];

      if (value !== null && typeof value === 'object' && !(value.constructor && value.constructor.isClass)) {
        this.get(prop).setProperties(value);
        delete props[prop];
      }
    }

    this.setProperties(props);

    return this;
  }
});
