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

w = require('winston');

var koa = require('koa'),
    router = require('koa-router'),
    hbs = require('koa-hbs'),
    less = require('koa-less'),
    serve = require('koa-static'),
    error = require('koa-error'),
    logger = require('koa-logger'),
    mount = require('koa-mount'),
    routesIndex = require('./routes'),
    routesPages = require('./routes/pages'),
    authenticator = require('./controllers/authenticator'),
    seqChecker = require('./controllers/seqChecker'),
    listenController = require('./controllers/listen'),
    msgController = require('./controllers/message'),
    loginController = require('./controllers/login'),
    registerController = require('./controllers/register'),
    path = require('path');

// Configure logging
w.add(w.transports.File, { filename: 'mas.log' });
//w.remove(w.transports.Console);

var app = koa();

w.info('Server starting.');

// Development only
if (app.env === 'development') {
    app.use(error());
//    app.use(logger());
}

app.use(hbs.middleware({
    defaultLayout: 'layouts/main',
    viewPath: __dirname + '/views'
}));

hbs.registerHelper('getPageJSFile', function() {
    return this.page + '.js';
});

app.use(router(app));

// REST API routes
app.get('/api/listen/:sessionId/:listenSeq/:timezone?*',
    authenticator, seqChecker, listenController);
app.post('/api/send/:sessionId/:sendSeq',
    authenticator, seqChecker, msgController);

// Registration and login routes
app.resource('login', loginController);
app.resource('register', registerController);

// Public routes
app.use(less(path.join(__dirname, 'public')));
app.use(serve(path.join(__dirname, 'public')));

// Qooxdoo routes
app.use(mount('/main', serve(path.join(__dirname, '/../client'))));
app.use(mount('/qooxdoo-sdk', serve(path.join(__dirname,
    '../vendor/qooxdoo-sdk'))));

// Page routes
app.get('/', routesIndex);
app.get(/.html$/, routesPages); // All other pages

app.listen(3000);
