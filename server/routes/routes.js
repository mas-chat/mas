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

const path = require('path');
const router = require('koa-router')();
const send = require('koa-send');
const proxy = require('koa-proxy');
const bodyParser = require('koa-bodyparser');
const koaBody = require('koa-body');
const conf = require('../lib/conf');
const passport = require('../lib/passport');
const registerController = require('../controllers/register');
const loginController = require('../controllers/login');
const websiteController = require('../controllers/website');
const uploadController = require('../controllers/upload');
const userFilesController = require('../controllers/userFiles');
const forgotPasswordController = require('../controllers/forgotPassword');
const confirmEmailController = require('../controllers/confirmEmail');

const ONE_YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365;
const TWO_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 2;
const fingerPrintRe = /^assets\/\S+-.{32}\.\w+$/;
const devMode = process.env.NODE_ENV !== 'production';

exports.register = function register(app) {
    // Passport authentication routes
    if (conf.get('googleauth:enabled') && conf.get('googleauth:openid_realm')) {
        router.get('/auth/google', passport.authenticate('google', {
            scope: 'email profile',
            openIDRealm: conf.get('googleauth:openid_realm')
        }));
        router.get('/auth/google/oauth2callback', loginController.googleLogin);
    }

    if (conf.get('yahooauth:enabled')) {
        router.get('/auth/yahoo', passport.authenticate('yahoo'));
        router.get('/auth/yahoo/callback', loginController.yahooLogin);
    }

    if (conf.get('cloudronauth:enabled')) {
        router.get('/auth/cloudron', passport.authenticate('cloudron'));
        router.get('/auth/cloudron/callback', loginController.cloudronLogin);
    }

    router.post('/login', bodyParser(), loginController.localLogin);

    // File upload endpoint
    router.post('/api/v1/upload', koaBody({ multipart: true }), uploadController);

    // Registration routes
    router.get('/register', registerController.index);
    router.post('/register', bodyParser(), registerController.create);
    router.post('/register-ext', registerController.createExt);
    router.post('/register-reset', registerController.createReset);

    // Forgot password
    router.post('/forgot-password', bodyParser(), forgotPasswordController.create);
    router.get('/reset-password/:token', registerController.indexReset);

    // Confirm email
    router.get('/confirm-email/:token', confirmEmailController.show);

    // Public uploaded files
    router.get('/files/:uuid/:slug*', userFilesController);

    // Client
    router.get('/app', function *client() {
        this.set('Cache-control', 'private, max-age=0, no-cache');
        yield sendFile(this, 'client/dist/', 'index.html');
    });

    // Client assets
    router.get(/^\/app\/(.+)/, function *clientAssets() {
        const subPath = this.params[0];
        const maxage = devMode ? 0 : fingerPrintRe.test(subPath) ? ONE_YEAR_IN_MS : TWO_DAYS_IN_MS;

        yield sendFile(this, 'client/dist/', this.params[0], { maxage });
    });

    if (devMode) {
        // Ember CLI Live Reload redirect hack
        router.get('/ember-cli-live-reload.js', function *redirect() { // eslint-disable-line require-yield, max-len
            this.redirect('http://localhost:4200/ember-cli-live-reload.js');
        });
    }

    // New client
    router.get(/\/sector17(.*)/, function *newClientAssets() {
        const subPath = this.params[0].replace(/^\//, '');

        if (devMode) {
            yield proxy.call(this, {
                host: 'http://localhost:8080',
                map: () => `/sector17/${subPath}`
            });

            this.set('Cache-control', 'private, max-age=0, no-cache');
        } else {
            yield sendFile(this, 'newclient/dist/', this.params[0], {
                maxage: subPath === '' ? 0 : ONE_YEAR_IN_MS
            });
        }
    });

    // Web site pages
    router.get(/^\/(about|$)\/?$/, websiteController);

    // Web site assets
    router.get(/^\/website-assets\/(.+)/, function *websiteAssets() {
        yield sendFile(this, 'server/website/dist/', this.params[0], { maxage: ONE_YEAR_IN_MS });
    });

    app.use(router.routes()).use(router.allowedMethods());
};

function *sendFile(ctx, root, filePath, options = {}) {
    const sendOptions = Object.assign({}, options, {
        root: path.join(__dirname, `../../${root}`)
    });

    yield send(ctx, filePath === '' ? '/' : filePath, sendOptions);
}
