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

const init = require('./lib/init');

init.configureProcess('frontend');

const fs = require('fs');
const http = require('http');
const https = require('https');
const conf = require('./lib/conf');
const log = require('./lib/log');
const main = require('./main');

const httpPort = conf.get('frontend:http_port');
const httpsPort = conf.get('frontend:https_port');

let httpHandler = initialHandler;
let httpsHandler = initialHandler;

const httpServer = http.Server(httpHandlerSelector); // eslint-disable-line new-cap
let httpsServer = null;

httpServer.listen(httpPort, httpListenDone);
log.info(`MAS frontend http server listening, http://localhost:${httpPort}/`);

if (conf.get('frontend:https')) {
    const caCerts = [];
    const caCertFileList = conf.get('frontend:https_ca');

    if (caCertFileList) {
        for (const file of caCertFileList.split(',')) {
            caCerts.push(fs.readFileSync(file));
        }
    }

    httpsServer = https.createServer({
        key: fs.readFileSync(conf.get('frontend:https_key')),
        cert: fs.readFileSync(conf.get('frontend:https_cert')),
        ca: caCerts
    }, httpsHandlerSelector);

    httpsServer.listen(httpsPort, listensDone);
    log.info(`MAS frontend https server listening, https://localhost:${httpsPort}/`);
}

function setHTTPHandlers(newHttpHandler, newHttpsHandler) {
    httpHandler = newHttpHandler;
    httpsHandler = newHttpsHandler;
}

function httpHandlerSelector(request, response) {
    httpHandler(request, response);
}

function httpsHandlerSelector(request, response) {
    httpsHandler(request, response);
}

function initialHandler(request, response) {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Server starting. Try again in few seconds...\n');
}

function httpListenDone() {
    if (!conf.get('frontend:https')) {
        listensDone();
    }
}

function listensDone() {
    main.init(httpServer, httpsServer, setHTTPHandlers);
}
