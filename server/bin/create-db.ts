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

import Rigiddb from 'rigiddb';
import { get } from '../lib/conf';

const db = new Rigiddb(
  'mas',
  1,
  {
    db: 10,
    host: get('redis:host'),
    port: get('redis:port')
  },
  error => {
    console.error(`Failed to connect to Redis, error: ${error}`);
    process.exit(0);
  }
);

(async function main() {
  const { val, reason } = await db.setSchema({
    users: {
      definition: {
        deleted: { type: 'boolean', allowNull: false },
        deletionTime: 'timestamp',
        email: 'string',
        deletedEmail: 'string',
        emailConfirmed: { type: 'boolean', allowNull: false },
        emailMD5: 'string',
        extAuthId: 'string',
        inUse: { type: 'boolean', allowNull: false },
        canUseIRC: { type: 'boolean', allowNull: false },
        planLevel: { type: 'int', allowNull: false },
        discount: 'int',
        lastIp: 'string', // not used
        lastLogout: { type: 'timestamp', allowNull: false },
        name: 'string',
        nick: 'string',
        password: 'string',
        passwordType: 'string',
        registrationTime: { type: 'timestamp', allowNull: false },
        secret: 'string', // not used
        secretExpires: 'timestamp' // not used
      },
      indices: {
        email: {
          uniq: true,
          fields: [{ name: 'email', caseInsensitive: true }]
        },
        nick: {
          uniq: true,
          fields: [{ name: 'nick', caseInsensitive: true }]
        },
        extAuth: {
          uniq: true,
          fields: ['extAuthId']
        }
      }
    },
    sessions: {
      definition: {
        userId: { type: 'int', allowNull: false },
        token: { type: 'string', allowNull: false },
        updatedAt: { type: 'timestamp', allowNull: false },
        ip: { type: 'string', allowNull: false }
      },
      indices: {
        userId: {
          uniq: false,
          fields: ['userId']
        }
      }
    },
    windows: {
      definition: {
        userId: { type: 'int', allowNull: false },
        conversationId: { type: 'int', allowNull: false },
        emailAlert: 'boolean',
        notificationAlert: 'boolean',
        soundAlert: 'boolean',
        titleAlert: 'boolean',
        minimizedNamesList: 'boolean',
        desktop: 'int',
        row: 'int',
        column: 'int'
      },
      indices: {
        userId: {
          uniq: false,
          fields: ['userId']
        },
        conversationId: {
          uniq: false,
          fields: ['conversationId']
        },
        userIdConversationId: {
          uniq: true,
          fields: ['userId', 'conversationId']
        }
      }
    },
    settings: {
      definition: {
        userId: { type: 'int', allowNull: false },
        activeDesktop: 'int',
        theme: 'string'
      },
      indices: {
        userId: {
          uniq: true,
          fields: ['userId']
        }
      }
    },
    friends: {
      definition: {
        srcUserId: { type: 'int', allowNull: false },
        dstUserId: { type: 'int', allowNull: false },
        state: { type: 'string', allowNull: false } // asking, pending, blocked, active
      },
      indices: {
        srcUserId: {
          uniq: false,
          fields: ['srcUserId']
        },
        dstUserId: {
          uniq: false,
          fields: ['dstUserId']
        },
        friends: {
          uniq: true,
          fields: ['srcUserId', 'dstUserId']
        }
      }
    },
    conversations: {
      definition: {
        type: { type: 'string', allowNull: false },
        network: { type: 'string', allowNull: false },
        name: 'string',
        owner: { type: 'int' },
        topic: 'string',
        password: 'string',
        team: 'string',
        secret: 'boolean'
      },
      indices: {
        networkName: {
          uniq: false,
          fields: ['type', 'network', { name: 'name', caseInsensitive: true }]
        },
        team: {
          uniq: false,
          fields: ['team']
        }
      }
    },
    conversationMembers: {
      definition: {
        conversationId: { type: 'int', allowNull: false },
        userGId: { type: 'string', allowNull: false },
        role: { type: 'string', allowNull: false }
      },
      indices: {
        userGId: {
          uniq: false,
          fields: ['userGId']
        },
        conversationId: {
          uniq: false,
          fields: ['conversationId']
        },
        userGIdconversationId: {
          uniq: true,
          fields: ['userGId', 'conversationId']
        }
      }
    },
    conversationMessages: {
      definition: {
        conversationId: { type: 'int', allowNull: false },
        userGId: 'string',
        ts: { type: 'timestamp', allowNull: false },
        updatedTs: 'timestamp',
        updatedId: 'int',
        cat: { type: 'string', allowNull: false },
        body: 'string',
        status: { type: 'string', allowNull: false }
      },
      indices: {
        conversationId: {
          uniq: false,
          fields: ['conversationId']
        }
      }
    },
    networkInfos: {
      definition: {
        userId: { type: 'int', allowNull: false },
        network: { type: 'string', allowNull: false },
        state: { type: 'string', allowNull: false }, // disconnected, connecting, connected, closing, idleclosing, idledisconnected
        nick: 'string',
        retryCount: 'int'
      },
      indices: {
        userId: {
          uniq: false,
          fields: ['userId']
        },
        userIdNetwork: {
          uniq: true,
          fields: ['userId', 'network']
        },
        nick: {
          uniq: true,
          fields: ['network', { name: 'nick', caseInsensitive: true }]
        }
      }
    },
    ircSubscriptions: {
      definition: {
        userId: { type: 'int', allowNull: false },
        network: { type: 'string', allowNull: false },
        channel: { type: 'string', allowNull: false },
        password: 'string'
      },
      indices: {
        userIdNetwork: {
          uniq: false,
          fields: ['userId', 'network']
        },
        userIdNetworkChannel: {
          uniq: true,
          fields: ['userId', 'network', { name: 'channel', caseInsensitive: true }]
        }
      }
    },
    ipms: {
      definition: {
        body: { type: 'string', allowNull: false },
        expiresAt: { type: 'timestamp', allowNull: false }
      }
    },
    pendingIpms: {
      definition: {
        userId: { type: 'int', allowNull: false },
        ipmId: { type: 'int', allowNull: false }
      },
      indices: {
        userId: {
          uniq: false,
          fields: ['userId']
        },
        ipmId: {
          uniq: false,
          fields: ['ipmId']
        }
      }
    },
    missedMessages: {
      definition: {
        userId: { type: 'int', allowNull: false },
        conversationId: { type: 'int', allowNull: false },
        msgUserGId: { type: 'string', allowNull: false },
        msgBody: { type: 'string', allowNull: false },
        msgTs: { type: 'timestamp', allowNull: false }
      }
    }
  });

  if (reason === 'Schema already exists') {
    console.log('RigidDB schema is up-to-date');
  } else {
    console.log(val ? 'RigidDB schema initialized successfully.' : `ERROR: ${reason}`);
  }

  await db.quit();
})();
