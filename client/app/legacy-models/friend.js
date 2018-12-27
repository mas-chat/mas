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

import Mobx from 'mobx';
import { computed } from '@ember/object';
import BaseModel from './base';
import userStore from '../stores/UserStore';

const { autorun } = Mobx;

function monitor(name, ...args) {
  autorun(() => this.set(name, args[args.length - 1].call(this)));
  return computed(...args);
}

export default BaseModel.extend({
  userId: null,

  name: monitor('name', 'userId', function() {
    return userStore.users.get(this.userId).name;
  })
});
