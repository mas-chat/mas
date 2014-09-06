#!/usr/bin/env node --harmony
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

require('./lib/init')('frontend');

var path = require('path'),
    koa = require('koa'),
    router = require('koa-router'),
    hbs = require('koa-hbs'),
    serve = require('koa-static'),
    error = require('koa-error'),
    bodyParser = require('koa-bodyparser'),
    compress = require('koa-compress'),
    //logger = require('koa-logger'),
    mount = require('koa-mount'),
    co = require('co'),
    handlebarsHelpers = require('./lib/handlebarsHelpers'),
    conf = require('./lib/conf'),
    redisModule = require('./lib/redis'),
    passport = require('./lib/passport'),
    userSession = require('./lib/userSession'),
    session = require('./lib/session'),
    routesIndex = require('./routes'),
    routesPages = require('./routes/pages'),
    routesApp = require('./routes/app'),
    seqChecker = require('./controllers/seqChecker'),
    listenController = require('./controllers/listen'),
    commandController = require('./controllers/command'),
    loginController = require('./controllers/login'),
    registerController = require('./controllers/register'),
    forgotPasswordController = require('./controllers/forgotPassword'),
    scheduler = require('./lib/scheduler');

var app = koa();

// Development only
if (app.env === 'development') {
    app.use(error());
//    app.use(logger());
}

// Enable GZIP compression
app.use(compress());

app.use(passport.initialize());

app.use(hbs.middleware({
    defaultLayout: 'layouts/main',
    viewPath: __dirname + '/views'
}));

handlebarsHelpers.registerHelpers(hbs);

app.use(userSession());

app.use(router(app));

// ROUTES START

// Passport authentication routes
if (conf.get('googleauth:enabled') === true && conf.get('googleauth:openid_realm')) {
    var googleAuthOptions = { scope: 'email profile' };
    googleAuthOptions.openIdRealm = conf.get('googleauth:openid_realm');

    app.get('/auth/google', passport.authenticate('google', googleAuthOptions));
    app.get('/auth/google/oauth2callback', loginController.googleLogin);
}

if (conf.get('yahooauth:enabled') === true) {
    app.get('/auth/yahoo', passport.authenticate('yahoo'));
    app.get('/auth/yahoo/callback', loginController.yahooLogin);
}

app.post('/login', bodyParser(), loginController.localLogin);

// REST API common filtering
app.all('/api/v1/:method/:sessionId/:seq/:timezone?*', session, seqChecker);

// REST API routes
app.get('/api/v1/listen*', listenController);
app.post('/api/v1/send*', commandController);

// Registration routes
app.get('/register', registerController.index);
app.post('/register', registerController.create);
app.post('/register-ext', registerController.createExt);
app.post('/register-reset', registerController.createReset);

// Forgot password
app.post('/forgot-password', bodyParser(), forgotPasswordController.create);
app.get('/reset-password/:token', registerController.indexReset);

// Special rule for hashed assets
app.get(/\/dist\/\S+-........\.\w+$/, function* (next) {
    yield next;
    this.set('Cache-Control', 'public, max-age=8640000'); // 100 days
});

// Page routes
app.get('/', routesIndex);
app.get(/^\/app/, routesApp);
app.get(/.html$/, routesPages); // All other pages

// ROUTES END

// Public assets
app.use(serve(path.join(__dirname, 'public')));
app.use(mount('/fonts/', serve(path.join(__dirname, 'public/dist/fonts'))));

co(function *() {
    yield redisModule.loadScripts();
    scheduler.init();
    app.listen(conf.get('frontend:port'));
})();
