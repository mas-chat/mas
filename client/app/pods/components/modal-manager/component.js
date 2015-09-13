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

/* globals $ */

import Ember from 'ember';

export default Ember.Component.extend({
    socket: Ember.inject.service(),

    activeModel: Ember.computed('modalQueue.[]', function() {
        let modalQueue = this.get('modalQueue');

        return modalQueue.length === 0 ? null : modalQueue.get('firstObject.model');
    }),

    activeModal: Ember.computed('modalQueue.[]', function() {
        let modalQueue = this.get('modalQueue');

        return modalQueue.length === 0 ? 'empty-modal' : modalQueue.get('firstObject.name');
    }),

    _timer: null,

    init() {
        this._super();

        this.get('socket').registerNetworkErrorHandlers(this, this._nwErrorStart, this._nwErrorEnd);
    },

    actions: {
        closeModal() {
            this.get('modalQueue').shiftObject();
        }
    },

    _nwErrorStart() {
        this.set('_timer', Ember.run.later(this, function() {
            this.get('modalQueue').unshiftObject({ // Show immediately
                name: 'non-interactive-modal',
                model: {
                    title: 'Connection error',
                    body: 'Connection to server lost. Trying to reconnect…'
                }
            });
            this.set('_timer', null);
        }, 5000));
    },

    _nwErrorEnd() {
        let timer = this.get('_timer');

        if (timer) {
            Ember.run.cancel(timer);
        } else {
            this.get('modalQueue').shiftObject();
        }
    }
});
