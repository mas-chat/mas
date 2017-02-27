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

const init = require('./lib/init');

init.configureProcess('frontend');

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const util = require('util');
const Koa = require('koa');
const hbs = require('koa-hbs');
const error = require('koa-error');
const compress = require('koa-compress');
const logger = require('koa-logger');
const handlebarsHelpers = require('./lib/handlebarsHelpers');
const log = require('./lib/log');
const redis = require('./lib/redis');
const passport = require('./lib/passport');
const authSessionChecker = require('./lib/authSessionChecker');
const routes = require('./routes/routes');
const scheduler = require('./lib/scheduler');
const socketController = require('./controllers/socket');
const conf = require('./lib/conf');

let httpHandler = initialHandler;
let httpsHandler = initialHandler;

// eslint-disable-next-line new-cap
const httpServer = http.Server((req, resp) => httpHandler(req, resp));
let httpsServer = null;

createHTTPServers();
scheduler.init();

init.on('beforeShutdown', async () => {
    await socketController.shutdown();
    scheduler.quit();
});

init.on('afterShutdown', async () => {
    redis.shutdown();
    httpServer.close();

    if (httpServer) {
        httpServer.close();
    }

    log.quit();
});

function initialHandler(request, response) {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Server starting. Try again in a second...\n');
}

function createHTTPServers() {
    const httpPort = conf.get('frontend:http_port');
    const httpsPort = conf.get('frontend:https_port');

    httpServer.listen(httpPort, () => {
        log.info(`Frontend HTTP server listening: http://0.0.0.0:${httpPort}/`);
    });

    const app = createFrontendApp();

    if (conf.get('frontend:https')) {
        const caCertList = conf.get('frontend:https_ca');

        httpsServer = https.createServer({
            key: fs.readFileSync(conf.get('frontend:https_key')),
            cert: fs.readFileSync(conf.get('frontend:https_cert')),
            ca: caCertList ? caCertList.split(',').map(file => fs.readFileSync(file)) : []
        }, (req, resp) => httpsHandler(req, resp));

        httpsServer.listen(httpsPort, () => {
            log.info(`MAS frontend https server listening, https://localhost:${httpsPort}/`);
        });

        httpsHandler = app.callback();
        httpHandler = createForceSSLApp().callback();
    } else {
        httpHandler = app.callback();
    }

    socketController.setup(conf.get('frontend:https') ? httpsServer : httpServer);
}

function createFrontendApp() {
    const app = new Koa();

    app.on('error', err => log.warn(`Koa server error: ${util.inspect(err)}`));

    if (process.env.NODE_ENV === 'development') {
        app.use(logger());
    }

    app.use(error());

    app.use(async (ctx, next) => {
        ctx.set('X-Frame-Options', 'DENY');
        await next();
    });

    app.use(compress()); // Enable GZIP compression

    app.use(passport.initialize());

    app.use(hbs.middleware({
        layoutsPath: path.join(__dirname, 'views/layouts'),
        viewPath: path.join(__dirname, 'views'),
        defaultLayout: 'main'
    }));

    app.use(authSessionChecker.processCookie);

    handlebarsHelpers.registerHelpers(hbs);

    routes.register(app);

    // Socket.io server (socketController) must be created after last app.use()

    return app;
}

function createForceSSLApp() {
    const app = new Koa();

    // To keep things simple, force SSL is always activated if https is enabled
    app.use(ctx => {
        ctx.response.status = 301;
        ctx.response.redirect(conf.getComputed('site_url') + ctx.request.url);
    });

    return app;
}
