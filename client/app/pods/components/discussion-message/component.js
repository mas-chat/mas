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

import { autorun } from 'mobx';
import Component from '@ember/component';
import EmberObject from '@ember/object';

let previousEditedMessage = null;

export default Component.extend({
  classNames: ['message-list'],

  editing: false,
  editBody: null,

  init(args) {
    this._super(args);

    const message = this.message;

    this.disposers = [
      autorun(() => this.set('gid', message.gid)),
      autorun(() => this.set('body', message.body)),
      autorun(() => this.set('cat', message.cat)),
      autorun(() => this.set('ts', message.ts)),
      autorun(() => this.set('userId', message.userId)),
      autorun(() => this.set('status', message.status)),
      autorun(() => this.set('updatedTs', message.updatedTs)),
      autorun(() => this.set('hideImages', message.hideImages)),
      autorun(() => this.set('editing', message.editing)),
      autorun(() => this.set('ircMotd', message.ircMotd)),
      autorun(() => this.set('edited', message.edited)),
      autorun(() => this.set('editing', message.editing)),
      autorun(() => this.set('deleted', message.deleted)),
      autorun(() => this.set('updatedTime', message.updatedTime)),
      autorun(() => this.set('updatedDate', message.updatedDate)),
      autorun(() => this.set('updatedDateLong', message.updatedDateLong)),
      autorun(() => this.set('nick', message.nick)),
      autorun(() => this.set('avatarUrl', message.avatarUrl)),
      autorun(() => this.set('decoratedCat', message.decoratedCat)),
      autorun(() => this.set('decoratedTs', message.decoratedTs)),
      autorun(() => this.set('channelAction', message.channelAction)),
      autorun(() => this.set('myNotDeletedMessage', message.myNotDeletedMessage)),
      autorun(() => this.set('bodyParts', message.bodyParts)),
      autorun(() => this.set('text', message.text)),
      autorun(() => this.set('images', message.images.map(image => EmberObject.create(image)))),
      autorun(() => this.set('hasMedia', message.hasMedia)),
      autorun(() => this.set('hasImages', message.hasImages)),
      autorun(() => this.set('hasYoutubeVideo', message.hasYoutubeVideo)),
      autorun(() => this.set('videoId', message.videoId)),
      autorun(() => this.set('videoParams', message.videoParams))
    ];
  },

  didDestroyElement() {
    this.disposers.forEach(element => element());
  },

  actions: {
    toggleImages() {
      this.toggleProperty('hideImages');
    },

    edit() {
      this._endEdit();

      this.set('editBody', this.body);
      this.set('editing', true);

      previousEditedMessage = this;
    },

    change() {
      this.sendAction('editMessage', this.gid, this.editBody);
      this._endEdit();
    },

    cancel() {
      this._endEdit();
    },

    delete() {
      this.sendAction('deleteMessage', this.gid);
      this._endEdit();
    }
  },

  _endEdit() {
    if (previousEditedMessage) {
      previousEditedMessage.set('editing', false);
      previousEditedMessage = null;
    }
  }
});
