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

import Ember from 'ember';

export default Ember.Route.extend({
    modalOpen: false,
    modalQueue: Ember.A([]),
    fullScreenModalOpen: false,

    store: Ember.inject.service(),

    setupController: function(controller) {
        controller.set('alerts', this.get('store.alerts'));
    },

    actions: {
        openModal: function(modalName, model) {
            if (this.get('modalOpen')) {
                // New modal goes to a queue if there's already a modal open.
                this.modalQueue.pushObject({
                    name: modalName,
                    model: model
                });
            } else {
                this._open(modalName, model);
            }
        },

        toggleFullScreenModal: function(modalName, model) {
            if (this.get('fullScreenModalOpen')) {
                this.disconnectOutlet({
                    outlet: 'fullscreen-modal',
                    parentView: 'application'
                });

                this.set('fullScreenModalOpen', false);
            } else {
                this.render(modalName, {
                    into: 'application',
                    outlet: 'fullscreen-modal',
                    model: model
                });

                this.set('fullScreenModalOpen', true);
            }
        },

        closeModal: function() {
            this.disconnectOutlet({
                outlet: 'modal',
                parentView: 'application'
            });

            let nextModal = this.modalQueue.shiftObject();

            if (nextModal) {
                Ember.run.later(this, function() {
                    this._open(nextModal.name, nextModal.model);
                }, 300);
            } else {
                this.set('modalOpen', false);
            }
        }
    },

    _open: function(modalName, model) {
        this.render(modalName, {
            into: 'application',
            outlet: 'modal',
            model: model
        });

        this.set('modalOpen', true);
    }
});
