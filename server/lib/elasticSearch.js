//
//   Copyright 2015 Ilkka Oksanen <iao@iki.fi>
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

const elasticsearch = require('elasticsearch');
const log = require('./log');
const conf = require('./conf');

let elasticSearchClient = null;

exports.getClient = function getClient() {
    if (!elasticSearchClient) {
        const url = `${conf.get('elasticsearch:host')}:${conf.get('elasticsearch:port')}`;

        log.info(`Connecting to elasticsearch: ${url}`);

        elasticSearchClient = new elasticsearch.Client({
            host: url,
            keepAlive: true,
            maxSockets: 15,
            minSockets: 10
        });
    }

    return elasticSearchClient;
};
