    //
//   Copyright 2009-2013 Ilkka Oksanen <iao@iki.fi>
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
    routesIndex = require('./routes'),
    routesPages = require('./routes/pages'),
    path = require('path');

var user = require('./middleware/User.js');
    chat = require('./lib/chat'),

// Configure logging
w.add(w.transports.File, { filename: 'mas.log' });
//w.remove(w.transports.Console);

var app = koa();

w.info('Server starting.');

// Development only
if (app.env === 'development') {
    app.use(error());
    app.use(logger());
}

app.use(hbs.middleware({
    defaultLayout: 'layouts/main',
    viewPath: __dirname + '/views'
}));

hbs.registerHelper('getPageJSFile', function() {
    return this.page + '.js';
});

app.use(router(app));

//app.use(express.favicon(path.join(__dirname, 'public/images/favicon.ico')));

// REST API routes
//app.use('/ralph', user());
//app.get('/ralph/:sessionId/:sendSeq/:timezone', chat.handleLongPoll);

// Routes handled by controllers
app.resource('login', require('./controllers/login'));
app.resource('register', require('./controllers/register'));

// Public routes
app.use(less(path.join(__dirname, 'public')));
app.use(serve(path.join(__dirname, 'public')));

// Qooxdoo routes
//app.use('/main', express.static(path.join(__dirname, '/../client')));
//app.use('/opt/qooxdoo', express.static('../vendor/qooxdoo-sdk'));
//app.use('/qooxdoo-sdk', express.static('../vendor/qooxdoo-sdk'));

// Page routes
app.get('/', routesIndex);
app.get(/.html$/, routesPages); // All other pages

app.listen(3000);
