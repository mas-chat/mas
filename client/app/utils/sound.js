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

import Howler from 'npm:howler';

let playing = false;

const notification = new Howler.Howl({
  src: ['/app/assets/sounds/staple_gun.mp3', '/app/assets/sounds/staple_gun.mp3'],
  volume: 0.6,

  onplay() {
    playing = true;
  },

  onend() {
    playing = false;
  }
});

export function play() {
  if (!playing) {
    notification.play();
  }
}
