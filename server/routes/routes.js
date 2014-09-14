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

var path = require('path'),
    router = require('koa-router'),
    serve = require('koa-static'),
    mount = require('koa-mount'),
    bodyParser = require('koa-bodyparser'),
    conf = require('../lib/conf'),
    passport = require('../lib/passport'),
    cacheFilter = require('../lib/cacheFilter'),
    sessionFilter = require('../lib/sessionFilter'),
    sequenceFilter = require('../lib/sequenceFilter'),
    validUserFilter = require('../lib/validUserFilter'),
    registerController = require('../controllers/register'),
    loginController = require('../controllers/login'),
    indexPageController = require('../controllers/pages'),
    appPageController = require('../controllers/pages/app'),
    pagesController = require('../controllers/pages/pages'),
    listenController = require('../controllers/listen'),
    commandController = require('../controllers/command'),
    userFilesController = require('../controllers/userFiles'),
    forgotPasswordController = require('../controllers/forgotPassword');

exports.register = function(app) {
    app.use(router(app));

    // Passport authentication routes
    if (conf.get('googleauth:enabled') === true && conf.get('googleauth:openid_realm')) {
        app.get('/auth/google', passport.authenticate('google', {
            scope: 'email profile',
            openIdRealm: conf.get('googleauth:openid_realm')
        }));
        app.get('/auth/google/oauth2callback', loginController.googleLogin);
    }

    if (conf.get('yahooauth:enabled') === true) {
        app.get('/auth/yahoo', passport.authenticate('yahoo'));
        app.get('/auth/yahoo/callback', loginController.yahooLogin);
    }

    app.post('/login', bodyParser(), loginController.localLogin);

    app.post(/^\/api/, validUserFilter);

    // JSON API endpoints
    app.post('/api/v1/:method', bodyParser(), sessionFilter, sequenceFilter);
    app.post('/api/v1/listen', listenController);
    app.post('/api/v1/send', commandController);

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

    // Page routes
    app.get('/', indexPageController);
    app.get(/^\/app/, appPageController);
    app.get(/.html$/, pagesController); // All other pages

    // Public assets
    app.get('/files/:file', userFilesController);

    app.use(serve(path.join(__dirname, '..', 'public'), {
        maxage: (1000 * 60 * 60 * 24 * 7) // 1 week
    }));

    app.use(mount('/fonts/', serve(path.join(__dirname, '..', 'public/dist/fonts'), {
        maxage: (1000 * 60 * 60 * 24 * 7) // 1 week
    })));
};
