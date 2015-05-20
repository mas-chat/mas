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

'use strict';

/* globals FileAPI, moment */

import Ember from 'ember';
import SendMsgMixin from './sendMsg';

export default Ember.Mixin.create(SendMsgMixin, {
    socket: Ember.inject.service(),
    store: Ember.inject.service(),

    actions: {
        upload(files, transform) {
            this.handleUpload(files, transform);
        }
    },

    handleUpload(files, transform) {
        if (files.length === 0) {
            return;
        }

        let options = {
            url: '/api/v1/upload',
            files: { userFiles: files },
            complete: function(err, xhr) {
                if (!err) {
                    let url = JSON.parse(xhr.responseText).url[0];
                    this._sendText(url, this.get('content'));
                } else {
                    this._printLine('File upload failed.', 'error');
                }
            }.bind(this),
            data: { sessionId: this.get('socket').sessionId }
        };

        if (transform === 'jpeg') {
            options.imageTransform = {
                type: 'image/jpeg',
                quality: 0.9
            };
        }

        FileAPI.upload(options);
    },

    _printLine(text, cat) {
        // Note that these errors share a special fixed gid. Gid is the primary key for messages so
        // only one is shown per window as new error replaces the existing one. This is intentional.
        this.get('store').upsertObject('message', {
            body: text,
            cat: cat,
            userId: cat === 'mymsg' ? this.get('store.userId') : null,
            ts: moment().unix(),
            gid: 'error'
        }, this.get('content'));
    }
});
