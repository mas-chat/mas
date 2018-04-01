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

import Mobx from 'npm:mobx';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import settingStore from '../../../stores/SettingStore';
import socket from '../../../utils/socket';
import { darkTheme } from '../../../utils/theme-dark';

const { autorun } = Mobx;

export default Component.extend({
  init(...args) {
    this._super(...args);

    this.disposer = autorun(() => {
      $('#theme-stylesheet').text(settingStore.settings.theme === 'dark' ? darkTheme : '');
    });

    socket.start(); // Let's get the show started.
  },

  didDestroyElement() {
    this.disposer();
  },

  stores: service(),

  classNames: ['flex-grow-column', 'flex-1'],

  draggedWindow: false
});
