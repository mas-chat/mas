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

var express = require('express'),
	exphbs  = require('express3-handlebars'),
	expressValidator = require('express-validator'),
	routes = require('./routes'),
	http = require('http'),
	path = require('path');

var chat = require('./lib/chat'),
	login = require('./lib/login'),
	register = require('./lib/register');

var app = express();

// All environments
app.set('port', process.env.PORT || 3000);

app.set('views', __dirname + '/views');

app.engine('handlebars', exphbs({
	defaultLayout: 'main',
	helpers: {
		getPageJSFile: function (object) { return this.page + '.js'; }
	}
}));

app.set('view engine', 'handlebars');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(expressValidator());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/public' }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/main', express.static( path.join(__dirname, '/..')));
app.use('/opt/qooxdoo', express.static('../qooxdoo-sdk'));

// Development only
if (app.get('env') === 'development') {
  app.use(express.errorHandler());
}

// Rest API
app.get('/ralph/:sessionId/:sendSeq/:timezone', chat.handleLongPoll);
app.post('/login', login.handleLogin);
app.post('/register', register.handleRegister);

// Web pages
app.get('/', routes.index);
app.get(/.html$/, routes.html);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
