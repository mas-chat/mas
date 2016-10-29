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

const Promise = require('bluebird');
const elasticSearchClient = Promise.promisifyAll(require('./elasticSearch').getClient());
const log = require('./log');

exports.storeMessage = function storeMessage(conversationId, msg) {
    if (!elasticSearchAvailable()) {
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
            conversationId
        }
    }, error => {
        if (error) {
            // TODO: Temporary
            log.warn(`Elasticsearch error. Failed to index messsage: ${error}`);
        }
    });

    return true;
};

exports.updateMessage = function updateMessage(gid, msg) {
    if (!elasticSearchAvailable()) {
        return false;
    }

    elasticSearchClient.update({
        index: 'messages',
        type: 'message',
        id: gid,
        body: {
            doc: {
                body: msg
            }
        }
    }, error => {
        if (error) {
            log.warn(msg.userId, `Elasticsearch error. Failed to index messsage: ${error}`);
        }
    });

    return true;
};

exports.getMessageRange = async function getMessageRange(conversationId, start, end, amount) {
    if (!elasticSearchAvailable()) {
        return [];
    }

    // TODO: If there are multiple messages at the boundary start/end ts, part of them can be lost.
    // Theoretical problem mostly. Solution is not lte.

    const range = {
        ts: {
            lt: end * 1000
        }
    };

    if (start) {
        range.ts.gte = start * 1000;
    }

    const response = await elasticSearchClient.search({
        index: 'messages',
        body: {
            size: amount || 1000,
            sort: {
                ts: {
                    order: 'desc'
                }
            },
            query: {
                filtered: {
                    filter: {
                        and: [
                            {
                                term: {
                                    conversationId
                                }
                            }, {
                                range
                            }
                        ]
                    }
                }
            }
        }
    });

    return convertToMsgs(response.hits.hits);
};

function convertToMsgs(hits) {
    return hits.map(hit => ({
        gid: hit._id,
        ts: Math.floor(hit._source.ts / 1000),
        body: hit._source.body,
        cat: hit._source.cat,
        userId: hit._source.userId
    }));
}

function elasticSearchAvailable() {
    if (!elasticSearchClient) {
        return false;
    }

    return true;
}
