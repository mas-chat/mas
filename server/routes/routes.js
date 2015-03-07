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

const path = require('path'),
      router = require('koa-router'),
      serve = require('koa-static'),
      mount = require('koa-mount'),
      bodyParser = require('koa-bodyparser'),
      conf = require('../lib/conf'),
      passport = require('../lib/passport'),
      cacheFilter = require('../lib/cacheFilter'),
      registerController = require('../controllers/register'),
      loginController = require('../controllers/login'),
      indexPageController = require('../controllers/pages'),
      pagesController = require('../controllers/pages/pages'),
      uploadController = require('../controllers/upload'),
      userFilesController = require('../controllers/userFiles'),
      forgotPasswordController = require('../controllers/forgotPassword');

const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

exports.register = function(app) {
    app.use(router(app));

    // Passport authentication routes
    if (conf.get('googleauth:enabled') === true && conf.get('googleauth:openid_realm')) {
        app.get('/auth/google', passport.authenticate('google', {
            scope: 'email profile',
            openIDRealm: conf.get('googleauth:openid_realm')
        }));
        app.get('/auth/google/oauth2callback', loginController.googleLogin);
    }

    if (conf.get('yahooauth:enabled') === true) {
        app.get('/auth/yahoo', passport.authenticate('yahoo'));
        app.get('/auth/yahoo/callback', loginController.yahooLogin);
    }

    app.post('/login', bodyParser(), loginController.localLogin);

    // File upload endpoint
    app.post('/api/v1/upload', uploadController);

    // Registration routes
    app.get('/register', registerController.index);
    app.post('/register', registerController.create);
    app.post('/register-ext', registerController.createExt);
    app.post('/register-reset', registerController.createReset);

    // Forgot password
    app.post('/forgot-password', bodyParser(), forgotPasswordController.create);
    app.get('/reset-password/:token', registerController.indexReset);

    // Special filter route for hashed assets
    app.get(/\/dist\/\S+-........\.\w+$/, cacheFilter);

    // Web site page routes
    app.get('/', indexPageController);
    app.get(/.html$/, pagesController); // All other pages

    // Public assets
    app.get('/files/:file', userFilesController);

    app.use(serve(path.join(__dirname, '..', 'public'), {
        maxage: ONE_WEEK
    }));

    // Ember client assets
    app.use(mount('/app', serve(path.join(__dirname, '../../client/dist'), {
        maxage: ONE_WEEK
    })));
};
