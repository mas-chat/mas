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

var wrapper = require('co-redis'),
    redis = wrapper(require('redis').createClient()),
    parse = require('co-body'),
    courier = require('../../lib/courier').createEndPoint('message');

module.exports = function *(next) {
    var userId = this.mas.userId;
    var body = yield parse.json(this.req);

    console.log('Prosessing command: ' + body.command);

    switch (body.command) {
        case 'SEND':
            yield courier.send('ircparser', {
                type: 'addText',
                userId: userId,
                network: 'TBD',
                text: body.text
            });
            break;
    }

    // TBD: Add lookup table for commands

    var resp = {
        status: 'OK'
    }

    this.body = resp;

};