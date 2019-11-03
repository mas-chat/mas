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

import { warn } from './log';
import { get } from './conf';

let elasticSearchClient = null;

export async function storeMessage(conversationId, msg) {
  if (!elasticSearchAvailable()) {
    return false;
  }

  try {
    await elasticSearchClient.create({
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
    });
  } catch (e) {
    warn(`Elasticsearch error. Failed to index messsage: ${e}`);
    return false;
  }

  return true;
}

export async function updateMessage(gid, msg) {
  if (!elasticSearchAvailable()) {
    return false;
  }

  try {
    await elasticSearchClient.update({
      index: 'messages',
      type: 'message',
      id: gid,
      body: {
        doc: {
          body: msg
        }
      }
    });
  } catch (e) {
    warn(`Elasticsearch error. Failed to index messsage: ${e}`);
    return false;
  }

  return true;
}

export async function getMessageRange(conversationId, start, end, amount) {
  if (!elasticSearchAvailable()) {
    return [];
  }

  // TODO: If there are multiple messages at the boundary start/end ts, part of them can be lost.
  // Theoretical problem mostly. Solution is not lte.
  const range: { [key: string]: any } = { lt: end * 1000 };
  let response;

  if (start) {
    range.gte = start * 1000;
  }

  try {
    response = await elasticSearchClient.search({
      index: 'messages',
      body: {
        size: amount || 1000,
        sort: {
          ts: {
            order: 'desc'
          }
        },
        query: {
          bool: {
            must: [{ term: { conversationId } }, { range: { ts: range } }]
          }
        }
      }
    });

    return convertToMsgs(response.body.hits.hits);
  } catch (e) {
    warn(`Elasticsearch error. Failed to search messsage: ${e}: ${JSON.stringify(response)}`);
    return [];
  }
}

function convertToMsgs(hits) {
  return hits.map(hit => ({
    gid: parseInt(hit._id),
    ts: Math.floor(hit._source.ts / 1000),
    body: hit._source.body,
    cat: hit._source.cat,
    userId: hit._source.userId
  }));
}

function elasticSearchAvailable() {
  if (!get('elasticsearch:enabled')) {
    return false;
  }

  if (!elasticSearchClient) {
    elasticSearchClient = require('./elasticSearch').getClient(); // Module is slow to require
  }

  return true;
}
