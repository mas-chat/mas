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

const path = require('path');
const Router = require('@koa/router');
const send = require('koa-send');
const body = require('koa-body');
const conf = require('../lib/conf');
const log = require('../lib/log');
const passport = require('../lib/passport');
const registerController = require('../controllers/register');
const loginController = require('../controllers/login');
const clientController = require('../controllers/client');
const uploadController = require('../controllers/upload');
const userFilesController = require('../controllers/userFiles');
const forgotPasswordController = require('../controllers/forgotPassword');
const confirmEmailController = require('../controllers/confirmEmail');

const ONE_YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365;
const TWO_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 2;
const fingerPrintRe = /^assets\/\S+-.{32}\.\w+$/;
const devMode = process.env.NODE_ENV !== 'production';

module.exports = function buildRouter() {
  log.info('Registering app routes');

  const router = new Router();

  // Passport authentication routes
  if (conf.get('googleauth:enabled') && conf.get('googleauth:openid_realm')) {
    router.get(
      '/auth/google',
      passport.authenticate('google', {
        scope: 'email profile',
        openIDRealm: conf.get('googleauth:openid_realm')
      })
    );
    router.get('/auth/google/oauth2callback', loginController.externalLogin('google'));
  }

  if (conf.get('yahooauth:enabled')) {
    router.get('/auth/yahoo', passport.authenticate('yahoo'));
    router.get('/auth/yahoo/callback', loginController.externalLogin('yahoo'));
  }

  if (conf.get('cloudronauth:enabled')) {
    router.get('/auth/cloudron', passport.authenticate('cloudron'));
    router.get('/auth/cloudron/callback', loginController.externalLogin('cloudron'));
  }

  router.post('/api/v1/login', body(), loginController.localLogin);

  // File upload endpoint
  router.post('/api/v1/upload', body({ multipart: true }), uploadController);

  // Registration routes
  router.get('/api/v1/register', registerController.index);
  router.post('/api/v1/register', body(), registerController.create);
  router.post('/api/v1/register-ext', registerController.createExt);
  router.post('/api/v1/register-reset', registerController.createReset);

  // Forgot password
  router.post('/api/v1/forgot-password', body(), forgotPasswordController.create);
  router.get('/app/reset-password/:token', registerController.indexReset);

  // Confirm email
  router.get('/app/confirm-email/:token', confirmEmailController.show);

  // Public uploaded files
  router.get('/files/:uuid/:slug*', userFilesController);

  // Client
  router.get('/app', clientController);

  // TODO: Improve when V1 client (route below) is removed
  router.get(/^\/app\/c\/(.+)/, clientController);

  // V2 Client assets
  router.get(/^\/app\/client-assets\/(.+)/, async ctx => {
    const maxage = devMode ? 0 : ONE_YEAR_IN_MS;
    await sendFile(ctx, 'new-client/dist/client-assets/', ctx.params[0], { maxage });
  });

  // V1 Client assets
  router.get(/^\/app\/(.+)/, async ctx => {
    const subPath = ctx.params[0];
    let maxage = TWO_DAYS_IN_MS;

    if (devMode) {
      maxage = 0;
    } else if (fingerPrintRe.test(subPath)) {
      maxage = ONE_YEAR_IN_MS;
    }

    await sendFile(ctx, 'client/dist/', subPath, { maxage });
  });

  return router;
};

async function sendFile(ctx, prefix, filePath, options = {}) {
  const sendOptions = { ...options, root: path.join(conf.root(), prefix) };

  await send(ctx, filePath === '' ? '/' : filePath, sendOptions);
}
