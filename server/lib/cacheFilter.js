//
//   Copyright 2014 Ilkka Oksanen <iao@iki.fi>
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

module.exports = function*(next) {
    yield next;

    // Set cache times for the client app
    let cacheTime = false;

    if (/^\/app\/*$/.test(this.path)) {
        // App index page
        cacheTime = 60 * 5; // 5 minutes
    } else if (/\/app\/assets\/\S+-.{32}\.\w+$/.test(this.path)) {
        // Fingerprinted app assets
        cacheTime = 60 * 60 * 24 * 365; // 1 year
    } else if (/^\/app\/*.+/.test(this.path)) {
        // All other app assets (not fingerprinted)
        cacheTime = 60 * 60 * 24 * 2; // 2 days
    }

    if (cacheTime) {
        this.set('Cache-Control', `public, max-age=${cacheTime}`);
    }
};
