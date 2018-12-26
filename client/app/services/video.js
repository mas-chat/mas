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

import { bind } from '@ember/runloop';
import { computed } from '@ember/object';
import Service from '@ember/service';

export default Service.extend({
  stream: null,

  streamActive: computed('stream', function() {
    return !!this.stream;
  }),

  getStream(successCb, failureCb) {
    const stream = this.stream;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      failureCb();
    }

    if (stream) {
      successCb(stream);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          width: 800,
          height: 600
        }
      })
      .then(
        bind(this, function(newStream) {
          this.set('stream', newStream);
          successCb(newStream);
        })
      )
      .catch(failureCb);
  },

  closeStream() {
    const stream = this.stream;

    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }

      this.set('stream', null);
    }
  }
});
