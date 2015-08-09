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

/* globals moment */

import Ember from 'ember';
import SendMsgMixin from './sendMsg';

export default Ember.Mixin.create(SendMsgMixin, {
    socket: Ember.inject.service(),
    store: Ember.inject.service(),

    actions: {
        upload(files) {
            this.handleUpload(files);
        }
    },

    handleUpload(files) {
        if (files.length === 0) {
            return;
        }

        let formData = new FormData();

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let name = file.name || 'webcam-upload.jpg';

            formData.append('file', file, name);
        }

        formData.append('sessionId', this.get('socket').sessionId);

        $.ajax({
            url: '/api/v1/upload',
            type: 'POST',
            data: formData,
            dataType: 'json',
            processData: false,
            contentType: false,
            success: data => this._sendText(data.url.join(' '), this.get('content')),
            error: () => this._printLine('File upload failed.', 'error')
       });
    },

    _printLine(text, cat) {
        // Note that these errors share a special fixed gid. Gid is the primary key for messages so
        // only one is shown per window as new error replaces the existing one. This is intentional.
        this.get('store').upsertModel('message', {
            body: text,
            cat: cat,
            userId: cat === 'mymsg' ? this.get('store.userId') : null,
            ts: moment().unix(),
            gid: 0,
        }, this.get('content'));
    }
});
