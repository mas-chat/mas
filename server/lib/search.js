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

const Promise = require('bluebird'),
      elasticSearchClient = Promise.promisifyAll(require('./elasticSearch').getClient()),
      log = require('./log');

exports.storeMessage = function(conversationId, msg) {
    if (!elasticSearchClient) {
        warn();
        return false;
    }

    elasticSearchClient.create({
        index: 'messages',
        type: 'message',
        id: msg.gid,
        body: {
            ts: msg.ts * 1000,
            body: msg.body,
            cat: msg.cat,
            userId: msg.userId,
            conversationId: conversationId
        }
    }, function(error) {
        if (error) {
            log.warn(msg.userId, 'Elasticsearch error. Failed to index messsage:' + error);
        }
    });

    return true;
};

exports.getMessagesForDay = function*(conversationId, start, end) {
    if (!elasticSearchClient) {
        warn();
        return;
    }

    let response = yield elasticSearchClient.search({
        index: 'messages',
        body: {
            size: 1000,
            sort: {
                ts: {
                    order: 'asc'
                }
            },
            query: {
                filtered: {
                    filter: {
                        and: [
                            {
                                term: {
                                    conversationId: conversationId
                                }
                            }, {
                                range: {
                                    ts: {
                                        gte: start * 1000,
                                        lte: end * 1000
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        }
    });

    return response.hits.hits.map(function(hit) {
        return {
            gid: hit._id,
            ts: Math.floor(hit._source.ts / 1000),
            body: hit._source.body,
            cat: hit._source.cat,
            userId: hit._source.userId
        };
    });
};

function warn() {
    log.warn('Fetch log request received even elasticsearch is disabled.');
}
