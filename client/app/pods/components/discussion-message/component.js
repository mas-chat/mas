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

import Mobx from 'mobx';
import Component from '@ember/component';
import EmberObject from '@ember/object';
import { A } from '@ember/array';

const { autorun } = Mobx;

export default Component.extend({
  classNames: ['message-list'],

  editBody: null,
  previousEditedMessage: null,

  init(args) {
    this._super(args);

    const message = this.message;

    this.disposer = autorun(() => {
      this.set('gid', message.gid);
      this.set('body', message.body);
      this.set('cat', message.cat);
      this.set('ts', message.ts);
      this.set('userId', message.userId);
      this.set('status', message.status);
      this.set('updatedTs', message.updatedTs);
      this.set('hideImages', message.hideImages);
      this.set('editing', message.editing);
      this.set('ircMotd', message.ircMotd);
      this.set('edited', message.edited);
      this.set('editing', message.editing);
      this.set('deleted', message.deleted);
      this.set('updatedTime', message.updatedTime);
      this.set('updatedDate', message.updatedDate);
      this.set('updatedDateLong', message.updatedDateLong);
      this.set('nick', message.nick);
      this.set('avatarUrl', message.avatarUrl);
      this.set('decoratedCat', message.decoratedCat);
      this.set('decoratedTs', message.decoratedTs);
      this.set('channelAction', message.channelAction);
      this.set('myNotDeletedMessage', message.myNotDeletedMessage);
      this.set('bodyParts', message.bodyParts);
      this.set('text', message.text);
      this.set('images', message.images.map(image => EmberObject.create(image)));
      this.set('hasMedia', message.hasMedia);
      this.set('hasImages', message.hasImages);
      this.set('hasYoutubeVideo', message.hasYoutubeVideo);
      this.set('videoId', message.videoId);
      this.set('videoParams', message.videoParams);
    });
  },

  actions: {
    toggleImages(message) {
      this.toggleProperty('hideImages');
    },

    edit(message) {
      this._endEdit();

      this.set('editBody', message.body);
      message.editing = true; // TODO: Mutates store

      this.set('previousEditedMessage', message);
    },

    change(message) {
      this.sendAction('editMessage', message.gid, this.editBody);
      this._endEdit();
    },

    cancel() {
      this._endEdit();
    },

    delete(message) {
      this.sendAction('deleteMessage', message.gid);
      this._endEdit();
    }
  },

  _endEdit() {
    const previousEditedMessage = this.previousEditedMessage;

    if (previousEditedMessage) {
      previousEditedMessage.editing = false; // TODO: Mutates store
      this.set('previousEditedMessage', null);
    }
  }
});
