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

/* global captureVideoFrame */

import Ember from 'ember';

export default Ember.Component.extend({
    action: Ember.inject.service(),
    video: Ember.inject.service(),

    shot: null,

    note: 'Allow webcam access in your browser.',

    actions: {
        uploadPhoto() {
            let file = this.get('shot');

            this.get('action').dispatch('UPLOAD_FILES', {
                files: [ file ],
                window: this.get('model')
            });

            this.sendAction('closeModal');
        },

        takePhoto() {
            if (!this.get('video.streamActive')) {
                alert('camera not active'); // eslint-disable-line no-alert
            }

            this.$('[data-modal="submit"]').removeClass('disabled');
            this.$('.btn-capture').blur();
            this.$('#webcam-snapshot').show();

            let video = this.$('#webcam-viewfinder video')[0];
            let { blob, dataUri } = captureVideoFrame(video, 'jpeg');

            this.$('#webcam-snapshot').attr('src', dataUri);
            this.set('shot', blob);
        },

        closeModal() {
            this.sendAction('closeModal');
            this.get('video').closeStream();
        }
    },

    didInsertElement() {
        this.$('[data-modal="submit"]').addClass('disabled');
        this.$('.btn-capture').addClass('disabled');
        this.$('#webcam-snapshot').hide();

        this.get('video').getStream(Ember.run.bind(this, this._getStreamSuccess),
            Ember.run.bind(this, this._getStreamError));
    },

    willDestroyElement() {
        this.get('video').closeStream();
    },

    _getStreamSuccess(stream) {
        this.set('note', '');
        this.$('.btn-capture').removeClass('disabled');

        this.$('#webcam-viewfinder video').attr('src', window.URL.createObjectURL(stream));
    },

    _getStreamError() {
        this.set('note', 'Auch! Webcam is not available.');
    }
});
