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

/* globals getUserMedia */

import Ember from 'ember';

export default Ember.Service.extend({
    stream: null,

    streamActive: Ember.computed('stream', function() {
        return !!this.get('stream');
    }),

    getStream(successCb, failureCb) {
        let stream = this.get('stream');

        if (stream) {
            successCb(stream);
            return;
        }

        let options = {
            audio: false,
            video: true,

            // the element (by id) you wish to use for
            // displaying the stream from a camera
            el: 'webcam-viewfinder',

            extern: null,
            append: true,

            width: 800,
            height: 600,

            mode: 'callback'
        };

        getUserMedia(options, Ember.run.bind(this, function(newStream) {
            this.set('stream', newStream);
            successCb(newStream);
        }), failureCb);
    },

    closeStream() {
        let stream = this.get('stream');

        if (stream) {
            for (let track of stream.getTracks()) {
                track.stop();
            }

            this.set('stream', null);
        }
    }
});
