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

import Ember from 'ember';

const noopCb = () => {};
let stores = [];

export function dispatch(type, data = {}, acceptCb = noopCb, rejectCb = noopCb) {
    let consumed = false;
    let name = type.split('_').map(part => part.toLowerCase().capitalize()).join('');
    let handler = `handle${name}`;

    for (let store of stores) {
        if (store[handler]) {
            consumed = true;
            store[handler].call(store, data, acceptCb, rejectCb);
            Ember.Logger.info(`[ACT] ${type}`);
            break;
        }
    }

    if (!consumed) {
        Ember.Logger.error(`No store handled action: ${type}`);
    }
}

export function register(store) {
    stores.push(store);
}

export function init() {
    Ember.run.next(this, function() {
        for (let store of stores) {
            store.loadSnapshot();
        }

        dispatch('START');
    });
}
