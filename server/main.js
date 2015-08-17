//
//   Copyright 2009-2015 Ilkka Oksanen <iao@iki.fi>
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
      koa = require('koa'),
      hbs = require('koa-hbs'),
      error = require('koa-error'),
      compress = require('koa-compress'),
      // logger = require('koa-logger'),
      co = require('co'),
      handlebarsHelpers = require('./lib/handlebarsHelpers'),
      log = require('./lib/log'),
      redisModule = require('./lib/redis'),
      passport = require('./lib/passport'),
      userSession = require('./lib/userSession'),
      routes = require('./routes/routes'),
      init = require('./lib/init'),
      scheduler = require('./lib/scheduler'),
      demoContent = require('./lib/demoContent'),
      socketController = require('./controllers/socket'),
      conf = require('./lib/conf');

const app = koa();

exports.init = function(httpServer, httpsServer, setHttpHandlers) {
    // Development only
    if (app.env === 'development') {
        app.use(error());
        // app.use(logger());
    }

    app.use(function*(next) {
        this.set('X-Frame-Options', 'DENY');
        yield next;
    });

    // Enable GZIP compression
    app.use(compress());

    app.use(passport.initialize());

    app.use(hbs.middleware({
        defaultLayout: 'layouts/main',
        viewPath: path.join(__dirname, 'views')
    }));

    app.use(userSession.auth);

    handlebarsHelpers.registerHelpers(hbs);
    routes.register(app);

    co(function*() {
        yield redisModule.loadScripts();
        yield redisModule.initDB();

        scheduler.init();

        // Socket.io server (socketController) must be created after last app.use()

        if (conf.get('frontend:https')) {
            socketController.setup(httpsServer);

            const forceSSLApp = koa();

            // To keep things simple, force SSL is always activated if https is enabled
            forceSSLApp.use(function*() {
                this.response.status = 301;
                this.response.redirect(conf.getComputed('site_url') + this.request.url);
            });

            setHttpHandlers(forceSSLApp.callback(), app.callback());
        } else {
            socketController.setup(httpServer);

            setHttpHandlers(app.callback(), null);
        }
    })();

    if (conf.get('frontend:demo_mode') === true) {
        demoContent.enable();
    }

    init.on('beforeShutdown', function*() {
        yield socketController.shutdown();
        scheduler.quit();
    });

    init.on('afterShutdown', function*() {
        redisModule.shutdown();
        httpServer.close();
        log.quit();
    });
};
