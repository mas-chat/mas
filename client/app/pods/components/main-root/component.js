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

/* global $ */

import { observer } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import socket from '../../../utils/socket';
import { darkTheme } from '../../../utils/theme-dark';

export default Component.extend({
  stores: service(),

  classNames: ['flex-grow-column', 'flex-1'],

  draggedWindow: false,

  init(...args) {
    this._super(...args);
    socket.start(); // Let's get the show started.
  },

  changeTheme: observer('stores.settings.theme', function() {
    $('#theme-stylesheet').text(this.get('stores.settings.theme') === 'dark' ? darkTheme : '');
  })
});
