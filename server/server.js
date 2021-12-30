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

import redis from './lib/redis';

const init = require('./lib/init');

init.configureProcess('frontend');

const fs = require('fs');
const zlib = require('zlib');
const http = require('http');
const https = require('https');
const path = require('path');
const util = require('util');
const Koa = require('koa');
const hbs = require('koa-hbs');
const error = require('koa-error');
const compress = require('koa-compress');
const logger = require('koa-logger');
const log = require('./lib/log');
const passport = require('./lib/passport');
const authSessionChecker = require('./lib/authSessionChecker');
const router = require('./routes/router')();
const scheduler = require('./lib/scheduler');
const socketController = require('./controllers/socket');
const conf = require('./lib/conf');

main();

function main() {
  const { httpServer, httpsServer } = createHTTPServers();

  socketController.setup(httpsServer || httpServer);
  scheduler.init();

  init.on('beforeShutdown', async () => {
    await socketController.shutdown();
    scheduler.quit();
  });

  init.on('afterShutdown', async () => {
    redis.shutdown();
    httpServer.close();

    if (httpsServer) {
      httpsServer.close();
    }

    log.quit();
  });
}

function createHTTPServers() {
  let httpServer;
  let httpsServer;
  const httpPort = conf.get('frontend:http_port');
  const httpsPort = conf.get('frontend:https_port');
  const app = createFrontendApp();

  if (conf.get('frontend:https')) {
    const caCertList = conf.get('frontend:https_ca');

    httpsServer = https.createServer(
      {
        key: fs.readFileSync(conf.get('frontend:https_key')),
        cert: fs.readFileSync(conf.get('frontend:https_cert')),
        ca: caCertList ? caCertList.split(',').map(file => fs.readFileSync(file)) : []
      },
      app.callback()
    );

    httpsServer.listen(httpsPort, () => {
      log.info(`MAS app HTTPS server listening, https://0.0.0.0:${httpsPort}/`);
    });

    httpServer = http.Server(createForceSSLApp().callback());
  } else {
    httpServer = http.Server(app.callback());
  }

  httpServer.listen(httpPort, () => {
    log.info(`MAS app HTTP server listening: http://0.0.0.0:${httpPort}/`);
  });

  return { httpServer, httpsServer };
}

function createFrontendApp() {
  const app = new Koa();

  app.on('error', err => {
    if (err.status !== 404 && !error.errno === 'EPIPE') {
      log.warn(`Koa server error: ${util.inspect(err)}`);
    }
  });

  if (process.env.NODE_ENV === 'development') {
    app.use(logger());
  }

  app.use(error());

  app.use(async (ctx, next) => {
    ctx.set('X-Frame-Options', 'DENY');
    await next();
  });

  app.use(
    compress({
      br: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4 // TODO: default is still 11 and way too slow
        }
      }
    })
  ); // Enable brotli and GZIP compression

  app.use(passport.initialize());

  app.use(
    hbs.middleware({
      layoutsPath: path.join(conf.root(), 'server/views/layouts'),
      viewPath: path.join(conf.root(), 'server/views'),
      defaultLayout: 'main'
    })
  );

  app.use(authSessionChecker.processCookie);

  app.use(router.routes());
  app.use(router.allowedMethods());

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
