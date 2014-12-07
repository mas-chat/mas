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

import Network from '../helpers/network';
import Store from '../helpers/store';
import FriendModel from '../models/friend';
import MessageModel from '../models/message';
import WindowModel from '../models/window';

export function initialize(container, application) {
    var store = Store.create();
    var network = Network.create({
        store: store,
        container: container
    });

    application.register('store:main', store, { instantiate: false });
    application.register('network:main', network, { instantiate: false });

    // Model factories
    application.register('model:friend', FriendModel, { singleton: false });
    application.register('model:message', MessageModel, { singleton: false });
    application.register('model:window', WindowModel, { singleton: false });
    application.inject('model:friend', 'store', 'store:main');
    application.inject('model:message', 'store', 'store:main');
    application.inject('model:window', 'store', 'store:main');

    application.inject('controller', 'store', 'store:main');
    application.inject('route', 'store', 'store:main');
    application.inject('model:base', 'store', 'store:main');

    application.inject('controller', 'remote', 'network:main');
}

export default {
    name: 'setup',
    initialize: initialize
};
