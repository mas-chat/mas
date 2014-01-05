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

var express = require('express'),
	exphbs  = require('express3-handlebars'),
	routesIndex = require('./routes'),
    routesPages = require('./routes/pages'),
    routesRegister = require('./routes/register'),
	http = require('http'),
	path = require('path');

var user = require('./middleware/User.js');
    chat = require('./lib/chat'),
	login = require('./lib/login');

// Configure logging
w.add(w.transports.File, { filename: 'mas.log' });
//w.remove(w.transports.Console);

var app = express();

w.info('Server starting.');

// All environments
app.set('port', process.env.PORT || 3000);

app.set('views', __dirname + '/views');

app.engine('handlebars', exphbs({
	defaultLayout: 'main',
	helpers: {
		getPageJSFile: function (object) { return this.page + '.js'; }
	}
}));

// Middlewares
app.set('view engine', 'handlebars');

app.use(express.favicon(path.join(__dirname, 'public/images/favicon.ico')));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use('/ralph', user());

app.use(app.router);

app.use(require('less-middleware')({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/main', express.static( path.join(__dirname, '/../client')));
app.use('/opt/qooxdoo', express.static('../qooxdoo-sdk'));
app.use('/qooxdoo-sdk', express.static('../qooxdoo-sdk'));

// Development only
if (app.get('env') === 'development') {
    app.use(express.errorHandler());
}

// Rest API routes
app.get('/ralph/:sessionId/:sendSeq/:timezone', chat.handleLongPoll);
app.post('/login', login.handleLogin);

// Page routes
app.get('/', routesIndex);
app.get('/register.html', routesRegister);
app.post('/register', routesRegister);
app.get(/.html$/, routesPages); // Order matters

http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});
