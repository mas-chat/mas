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

/*jshint camelcase: false */

window.Mas = Ember.Application.create();

require('../dist/templates.js');

require('./routes/application');
require('./routes/main');

require('./views/application');
require('./views/window');
require('./views/radioButton');

require('./components/modalDialog');

require('./controllers/main');
require('./controllers/window');
require('./controllers/joinGroupModal.js');
require('./controllers/createGroupModal.js');
require('./controllers/joinIrcModal.js');
require('./controllers/passwordModal.js');

require('./models/message');
require('./models/window');

require('./helpers/network');
require('./helpers/handlebars');

Mas.nicks = {};
Mas.windowCollection = Ember.A([]);

Mas.Router.map(function() {
    this.route('main', { path: '/' });
});

Mas.networkMgr = Mas.Network.create();

document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        titlenotifier.reset();
    }
});

emojify.defaultConfig.img_dir = '/vendor/emojify.js/images/emoji/';
