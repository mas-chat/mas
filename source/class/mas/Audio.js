//
//   Copyright 2009-2013 Ilkka Oksanen <iao@iki.fi>
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

qx.Class.define('mas.Audio', {
    extend: qx.core.Object,

    construct: function() {
        var soundFormat = 'none';

        //If statement is a hack to prevent running qooxdoo audio code on IE
        //feature detection is missing from Qooxdoo framework

        if (!!document.createElement('audio').canPlayType) {
            var detectAudio = new qx.bom.media.Audio();

            if (detectAudio.canPlayType('audio/mpeg') !== '') {
                soundFormat = 'mp3';
            } else if (detectAudio.canPlayType('audio/ogg') !== '') {
                soundFormat = 'ogg';
            } else if (detectAudio.canPlayType('audio/wave') !== '') {
                soundFormat = 'wav';
            }

            if (soundFormat !== 'none') {
                this._audio = new qx.bom.media.Audio(
                    'resource/mas/new-msg.' + soundFormat);
            }
        }

        debug.print('Sound support: ' + soundFormat);
    },

    members: {
        _audio: 0,

        play: function() {
            if (this._audio) {
                this._audio.setCurrentTime(0);
                this._audio.play();
            }
        }
    }
});
