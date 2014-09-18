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

Mas.CaptureModalView = Ember.View.extend({
    webcam: null,

    actions: {
        takePhoto: function() {
            if(!this.webcam.isActive()) {
                alert('camera not active');
            }

            var shot = this.webcam.shot();

            shot.clone().preview(150, 150).get(function(err, img) {
                this.$('.shot').empty();
                this.$('.shot').append(img);
            }.bind(this));

            this.set('controller.shot', shot);
        }
    },

    didInsertElement: function() {
        var box = this.$('.viewfinder')[0];

        FileAPI.Camera.publish(box, {}, function (err, cam){
            if (err) {
                alert('WebCam or Flash not supported :[');
            } else {
                this.webcam = cam;
                this.$('.activation-note').hide();
            }
        }.bind(this));
    },

    willDestroyElement: function() {
        this.webcam.stop();
    }
});
