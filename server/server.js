#!/usr/bin/env node
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

const fs = require('fs'),
      path = require('path'),
      koa = require('koa'),
      hbs = require('koa-hbs'),
      error = require('koa-error'),
      compress = require('koa-compress'),
      // logger = require('koa-logger'),
      co = require('co'),
      http = require('http'),
      https = require('https'),
      handlebarsHelpers = require('./lib/handlebarsHelpers'),
      conf = require('./lib/conf'),
      log = require('./lib/log'),
      redisModule = require('./lib/redis'),
      passport = require('./lib/passport'),
      userSession = require('./lib/userSession'),
      routes = require('./routes/routes'),
      scheduler = require('./lib/scheduler'),
      demoContent = require('./lib/demoContent'),
      socketController = require('./controllers/socket');

const app = koa();

// Development only
if (app.env === 'development') {
    app.use(error());
    // app.use(logger());
}

// Enable GZIP compression
app.use(compress());

app.use(passport.initialize());

app.use(hbs.middleware({
    defaultLayout: 'layouts/main',
    viewPath: path.join(__dirname, 'views')
}));

app.use(userSession());

handlebarsHelpers.registerHelpers(hbs);
routes.register(app);

co(function*() {
    yield redisModule.loadScripts();
    yield redisModule.initDB();

    scheduler.init();

    // Servers must be created after last app.use()

    let httpPort = conf.get('frontend:http_port');
    let httpServer = http.Server(app.callback());

    socketController.setup(httpServer);
    httpServer.listen(httpPort);

    log.info(`MAS frontend http server listening, http://localhost:${httpPort}/`);

    if (conf.get('frontend:https')) {
        let httpsPort = conf.get('frontend:https_port');
        let httpsServer = https.createServer({
            key: fs.readFileSync(conf.get('frontend:https_key')),
            cert: fs.readFileSync(conf.get('frontend:https_cert'))
        }, app.callback());

        socketController.setup(httpsServer);
        httpsServer.listen(httpsPort);

        log.info(`MAS frontend https server started, https://localhost:${httpsPort}/`);
    }
})();

if (conf.get('frontend:demo_mode') === true) {
    demoContent.enable();
}
