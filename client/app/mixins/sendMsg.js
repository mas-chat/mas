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

'use strict';

import Ember from 'ember';

export default Ember.Mixin.create({
    _sendText(text, window) {
        this.get('socket').send({
            id: 'SEND',
            text: text,
            windowId: window.get('windowId')
        }, function(resp) {
            if (resp.status !== 'OK') {
                this.send('openModal', 'info-modal', { title: 'Error', body: resp.errorMsg });
                return;
            }

            this.get('store').upsertObject('message', {
                body: text,
                cat: 'mymsg',
                userId: this.get('store.userId'),
                ts: resp.ts,
                gid: resp.gid,
            }, window);
        }.bind(this));
    }
});
