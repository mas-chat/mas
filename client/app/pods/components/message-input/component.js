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

import { observer } from '@ember/object';
import TextArea from '@ember/component/text-area';
import emojione from 'emojione';

const emojisList = Object.keys(emojione.emojioneList)
  .sort()
  .map((value, i) => ({ id: i, name: value }));

export default TextArea.extend({
  participants: null,
  pendingClear: false,

  attributeBindings: ['autocomplete'],

  autocomplete: 'nope',

  keyPress(e) {
    if (e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();

      const value = this.value;

      if (value !== '') {
        this.sendAction('sendMessage', value);
        this.set('value', '');
        this.$().height('100%');
      }
    }
  },

  input() {
    this._updateHeight();
  },

  nickCompletion: observer('participants', function () {
    const participants = this.participants || [];

    this.$().atwho({
      at: '@',
      data: participants.map(item => item.nick),
      limit: 15
    });
  }),

  didInsertElement() {
    this.$().atwho({
      at: ':',
      displayTpl: data => {
        const emoji = emojione.emojioneList[data.name];
        const unicode = emoji.unicode[emoji.unicode.length - 1];
        return `<li><img src="/app/assets/images/emoji/${unicode}.png"> ${data.name}</li>`;
      },
      insertTpl: '${name}', // eslint-disable-line no-template-curly-in-string
      data: emojisList,
      highlightFirst: false,
      limit: 20
    });

    this.$().on('hidden.atwho', e => {
      e.stopPropagation();
    });
  },

  _updateHeight() {
    const prevHeight = this.$().prop('style').height; // Get the non-computed value

    if (prevHeight !== '100%') {
      // By setting the height to 100%, scrollHeight below returns the actual value even when
      // content shrinks. We do this trick only when necessary as it causes noticeable lag
      // on Firefox.
      this.$().css('height', '100%');
    }

    let newHeight = Math.min(this.$().prop('scrollHeight'), 300);

    if (newHeight < 35) {
      newHeight = '100%';
    }

    if (newHeight !== '100%') {
      this.$().height(newHeight);
    }
  }
});
