//
//   Copyright 2015 Ilkka Oksanen <iao@iki.fi>
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

export default Ember.Object.extend({
    store: Ember.inject.service(),

    build: function(params) {
        let title;

        if (params.type === '1on1' && params.userId === 'iSERVER') {
            title = params.network + ' Server Messages';
        } else if (params.type === '1on1') {
            let conversationNetwork = params.network === 'MAS' ? '' : params.network + ' ';
            title = 'Private ' + conversationNetwork + 'conversation with ' +
            params.store.get('users').getNick(params.userId, params.network);
        } else if (params.network === 'MAS') {
            title = 'Group: ' + params.name.charAt(0).toUpperCase() + params.name.substr(1);
        } else {
            title = params.network + ': ' + params.name;
        }

        return title;
    }
});
