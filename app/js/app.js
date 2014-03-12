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

window.App = Ember.Application.create();

require('./routes/main');
require('./views/application');
require('./views/window');
require('./controllers/application');
require('./controllers/main');
require('./controllers/window');
require('./models/message');
require('./models/window');
require('./helpers/network');
require('./helpers/handlebars');

App.nicks = {};
App.windowCollection = Ember.A([]);

App.Router.map(function() {
    this.route('main', { path: '/' });
});

App.networkMgr = App.Network.create();
