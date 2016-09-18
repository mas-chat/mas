#!/usr/bin/env node
//
//   Copyright 2014 Ilkka Oksanen <iao@iki.fi>
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

// Minimal connection manager that keeps TCP sockets alive even if
// rest of the system is restarted. Allows nondistruptive updates.

const init = require('../../../lib/init');

init.configureProcess('irc-connman');

const net = require('net');
const tls = require('tls');
const carrier = require('carrier');
const isUtf8 = require('is-utf8');
const iconv = require('iconv-lite');
const ip = require('ip');
const conf = require('../../../lib/conf');
const log = require('../../../lib/log');
const courier = require('../../../lib/courier').createEndPoint('connectionmanager');

const sockets = {};
const nextNetworkConnectionSlot = {};
let identServer;

const LAG_POLL_INTERVAL = 60 * 1000; // 60s

init.on('beforeShutdown', async () => {
    if (conf.get('irc:identd')) {
        identServer.close();
    }

    await courier.quit();

    for (const key of Object.keys(sockets)) {
        const socket = sockets[key];
        socket.end('QUIT :MAS server restart.\r\n');
        socket.destroy();
    }
});

init.on('afterShutdown', () => {
    log.quit();
});

function handleIdentConnection(socket) {
    const timer = setTimeout(() => {
        if (socket) {
            socket.destroy();
        }
    }, 3000);

    socket.on('error', error => {
        log.info(`Ident socket error: ${error}`);
        socket.destroy();
    });

    carrier.carry(socket, line => {
        const ports = line.split(',');
        const localPort = parseInt(ports[0]);
        const remotePort = parseInt(ports[1]);
        const prefix = `${localPort}, ${remotePort}`;

        if (Number.isInteger(localPort) && Number.isInteger(remotePort)) {
            let resp = 'ERROR : NO-USER';

            for (const key of Object.keys(sockets)) {
                if (sockets[key].localPort === localPort &&
                    sockets[key].remotePort === remotePort &&
                    ip.isEqual(sockets[key].remoteAddress, socket.remoteAddress)) {
                    resp = `USERID : UNIX : ${sockets[key].nick}`;
                    break;
                }
            }

            socket.write(`${prefix} : ${resp}\r\n`);
            log.info(`Ident request from ${socket.remoteAddress}, req: ${line}, resp: ${resp}`);
        }

        clearTimeout(timer);
        socket.end();
    });
}

// Connect
courier.on('connect', params => {
    const network = params.network;
    const rateLimit = conf.get(`irc:networks:${network}:rate_limit`); // connections per minute
    let rateLimitDelay = 0;

    if (!nextNetworkConnectionSlot[network] || nextNetworkConnectionSlot[network] < Date.now()) {
        // Rate limiting not active
        nextNetworkConnectionSlot[network] = Date.now();
    } else {
        rateLimitDelay = nextNetworkConnectionSlot[network] - Date.now();
    }

    setTimeout(() => connect(params.userId, params.nick, network), rateLimitDelay + params.delay);

    nextNetworkConnectionSlot[network] += Math.round((60 / rateLimit) * 1000);
});

// Disconnect
courier.on('disconnect', params => {
    const network = params.network;
    const userId = params.userId;
    const socketName = `${userId}:${network}`;

    write({ userId, network, reportError: false }, `QUIT :${params.reason}`);

    if (sockets[socketName]) {
        sockets[socketName].end();
    }
});

// Write
courier.on('write', params => {
    write({ userId: params.userId, network: params.network, reportError: true }, params.line);
});

(async function main() {
    // Start IDENT server
    if (conf.get('irc:identd')) {
        identServer = net.createServer(handleIdentConnection);
        identServer.listen(conf.get('irc:identd_port'));
    }

    await courier.clearInbox('ircparser');
    courier.callNoWait('ircparser', 'restarted');
    await courier.listen();
}());

function connect(userId, nick, network) {
    if (sockets[`${userId}:${network}`]) {
        log.warn(userId, `Impossible happened. Already connected to IRC network: ${network}`);
        return;
    }

    const port = conf.get(`irc:networks:${network}:port`);
    const host = conf.get(`irc:networks:${network}:host`);
    const options = { host, port };
    let socket;
    let ssl = false;

    if (conf.get(`irc:networks:${network}:ssl`)) {
        ssl = true;
        socket = tls.connect(port, host, {});
    } else {
        socket = net.connect(options);
    }

    log.info(userId, `Connecting to IRC server, SSL: ${ssl}, host: ${host}, port: ${port}`);

    socket.nick = nick;
    socket.setKeepAlive(true, 2 * 60 * 1000); // 2 minutes

    function sendPing() {
        if (Date.now() - socket.last > LAG_POLL_INTERVAL) {
            // Nothing has been sent after previous round
            socket.write(`PING ${socket.ircServerName}\r\n`);
        }
    }

    socket.on('connect', () => {
        courier.callNoWait('ircparser', 'connected', { userId, network });

        socket.pingTimer = setInterval(sendPing, LAG_POLL_INTERVAL);
    });

    let buffer = '';

    socket.on('data', data => {
        socket.last = Date.now();

        // IRC protocol doesn't have character set concept, we need to guess. Algorithm is simple,
        // if the received binary data is valid utf8 then do no conversion. Else assume that the
        // character set is iso-8859-15 and convert it to utf8.
        const chunk = buffer + (isUtf8(data) ? data.toString() : iconv.decode(data, 'iso-8859-15'));
        const lines = chunk.split(/\r\n/);

        buffer = lines.pop(); // Save the potential partial line to buffer

        lines.forEach(line => {
            const proceed = handlePing(socket, line);

            if (proceed) {
                courier.callNoWait('ircparser', 'data', { userId, network, line });
            }
        });
    });

    socket.on('end', () => {
        handleEnd(userId, network, null);
    });

    socket.on('error', error => {
        handleEnd(userId, network, error);
    });

    socket.on('close', () => {
        handleEnd(userId, network, null);
    });

    sockets[`${userId}:${network}`] = socket;
}

function write(options, data) {
    const socket = sockets[`${options.userId}:${options.network}`];

    if (!socket) {
        if (options.reportError) {
            courier.callNoWait(
                'ircparser', 'noconnection', { userId: options.userId, network: options.network });
        }
        return;
    }

    const chunk = typeof data === 'string' ? [ data ] : data;

    chunk.forEach(line => socket.write(`${line}\r\n`));

    socket.last = Date.now();
}

// Minimal parser to handle server sent PING command at this layer
function handlePing(socket, line) {
    const parts = line.split(' ');

    if ((parts[0].charAt(0) === ':')) {
        parts.shift();
    }

    const command = parts.shift();

    if (command === 'PING') {
        socket.write(`PONG :${socket.ircServerName}\r\n`);
        return false;
    } else if (command === '004') {
        socket.ircServerName = parts[1]; // RFC 2812, reply 004
    }

    return true;
}

function handleEnd(userId, network, error) {
    const socket = sockets[`${userId}:${network}`];
    const reason = error ? error.code : 'connection closed by the server';

    if (!socket) {
        return; // Already handled
    }

    delete sockets[`${userId}:${network}`];
    clearInterval(socket.pingTimer);

    log.info(userId, 'IRC connection closed by the server or network.');

    courier.callNoWait('ircparser', 'disconnected', { userId, network, reason });
}
