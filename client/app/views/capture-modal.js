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

export default Ember.View.extend({
    // TBD: Ditch FileAPI, use native APIs directly. Allows e.g. to prefer 16:9 aspect ratio.

    webcam: null,

    actions: {
        takePhoto: function() {
            if (!this.webcam.isActive()) {
                alert('camera not active');
            }

            this.$('[data-modal="submit"]').removeClass('disabled');
            this.$('.btn-capture').blur();

            var shot = this.webcam.shot();

            shot.clone().preview(160, 120).get(function(err, img) {
                this.$('.shot').empty();
                this.$('.shot').append(img);
            }.bind(this));

            this.set('controller.shot', shot);
        }
    },

    didInsertElement: function() {
        var box = this.$('.viewfinder')[0];

        this.$('[data-modal="submit"]').addClass('disabled');
        this.$('.btn-capture').addClass('disabled');

        FileAPI.Camera.publish(box, {}, function(err, cam) {
            var newMessage = '';

            if (err) {
                newMessage = 'Auch! Webcam is not available.';
            } else {
                this.webcam = cam;
                this.$('.btn-capture').removeClass('disabled');
            }

            this.set('controller.note', newMessage);
        }.bind(this));
    },

    willDestroyElement: function() {
        if (this.webcam) {
            this.webcam.stop();
        }
    }
});
