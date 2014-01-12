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
	routesIndex = require('./routes'),
    routesPages = require('./routes/pages'),
    path = require('path');

var user = require('./middleware/User.js');
    chat = require('./lib/chat'),
	login = require('./lib/login');

// Configure logging
w.add(w.transports.File, { filename: 'mas.log' });
//w.remove(w.transports.Console);

var app = koa();

w.info('Server starting.');

// Development only
if (app.env === 'development') {
    app.use(error());
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
//app.use(express.logger('dev'));
//app.use(express.bodyParser());
//app.use(express.methodOverride());
//app.use(express.cookieParser());
//app.use('/ralph', user());

app.use(less(path.join(__dirname, 'public')));
app.use(serve(path.join(__dirname, 'public')));

//app.use('/main', express.static(path.join(__dirname, '/../client')));
//app.use('/opt/qooxdoo', express.static('../qooxdoo-sdk'));
//app.use('/qooxdoo-sdk', express.static('../qooxdoo-sdk'));

// Rest API routes
//app.get('/ralph/:sessionId/:sendSeq/:timezone', chat.handleLongPoll);
//app.post('/login', login.handleLogin);

app.resource('register', require('./controllers/register'));

// TBD: Use resource
//app.get('/register.html', routesRegister);
//app.post('/register', routesRegister);

// Page routes
app.get('/', routesIndex);
app.get(/.html$/, routesPages); // All other pages

app.listen(3000);
