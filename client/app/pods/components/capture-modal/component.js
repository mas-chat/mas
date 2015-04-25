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

/* global FileAPI */

import Ember from 'ember';
import UploadMixin from '../../../mixins/upload';

export default Ember.Component.extend(UploadMixin, {
    // TBD: Ditch FileAPI, use native APIs directly. Allows e.g. to prefer 16:9 aspect ratio.

    webcam: null,
    shot: null,

    note: 'Allow webcam access in your browser.',
    content: Ember.computed.alias('model'),

    actions: {
        uploadPhoto() {
            let file = this.get('shot').preview(800, 600);
            this.handleUpload([ file ], 'jpeg');
            this.sendAction('closeModal');
        },

        takePhoto() {
            if (!this.webcam.isActive()) {
                alert('camera not active');
            }

            this.$('[data-modal="submit"]').removeClass('disabled');
            this.$('.btn-capture').blur();

            let shot = this.webcam.shot();

            shot.clone().preview(160, 120).get(function(err, img) {
                this.$('.shot').empty();
                this.$('.shot').append(img);
            }.bind(this));

            this.set('shot', shot);
        },

        closeModal() {
            this.sendAction('closeModal');
        }
    },

    didInsertElement() {
        let box = this.$('.viewfinder')[0];

        this.$('[data-modal="submit"]').addClass('disabled');
        this.$('.btn-capture').addClass('disabled');

        FileAPI.Camera.publish(box, {}, function(err, cam) {
            let newMessage = '';

            if (err) {
                newMessage = 'Auch! Webcam is not available.';
            } else {
                this.webcam = cam;
                this.$('.btn-capture').removeClass('disabled');
            }

            this.set('note', newMessage);
        }.bind(this));
    },

    willDestroyElement() {
        if (this.webcam) {
            this.webcam.stop();
        }
    }

});
