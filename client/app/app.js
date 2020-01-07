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

import Application from '@ember/application';
import { registerDeprecationHandler } from '@ember/debug';
import loadInitializers from 'ember-load-initializers';
import isMobile from 'ismobilejs';
import Resolver from './resolver';
import config from './config/environment';

console.log(`MAS frontend version: ${config.APP.revision}`);
console.log(`isMobile: ${isMobile().any}`);

const App = Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver
});

const ignoredDeprecations = ['ember-views.curly-components.jquery-element', 'ember-component.send-action'];

registerDeprecationHandler((message, options, next) => {
  if (!ignoredDeprecations.includes(options.id)) {
    next(message, options);
  }
});

loadInitializers(App, config.modulePrefix);

export default App;
