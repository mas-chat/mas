#!/usr/bin/env node
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

const assert = require('assert'),
      co = require('co'),
      redisModule = require('../server/lib/redis'),
      redis = redisModule.createClient();

const tests = [
    desktopTest,
    activeDesktopTest,
    conversationIndexTest,
    conversationIndexAccessTest,
    conversationMembersTest,
    conversationListTest,
    oneOnOneHistoryTest,
    windowIndexTest,
    windowTest,
    windowlistTest,
    friendsExistTest
];

console.log(' *************************************************************************');
console.log(' *** This is a higly experimental Redis database consistency check tool');
console.log(' *** Remove the assert from the source code if you really want to use it.');
console.log(' *************************************************************************');

assert(0);

co(function*() {
    for (let test of tests) {
        yield test();
    }

    yield redis.quit();
    console.log('DONE');
})();

function *conversationIndexTest() {
    let conversationKeys = (yield redis.keys('conversation:*'));
    let conversationIndexFieldsLength = yield redis.hlen('index:conversation');

    let passed = conversationKeys.length === conversationIndexFieldsLength;

    printVerdict('index:conversation', passed);

    if (!passed) {
        console.log('Rebuilding index:conversation...');
        yield redis.del('index:conversation');

        for (let conversationKey of conversationKeys) {
            let conversation = yield redis.hgetall(conversationKey);
            let conversationId = conversationKey.split(':')[1];
            let key;

            let members = yield redis.hgetall(`conversationmembers:${conversationId}`);

            if (conversation.type === 'group') {
                key = `group:${conversation.network}:${conversation.name}`;
            } else {
                let users = Object.keys(members).sort();
                key = `1on1:${conversation.network}:${users[0]}:${users[1]}`;
            }

            yield redis.hset('index:conversation', key, conversationId);
        }
    }
}

function *conversationIndexAccessTest() {
    let index = yield redis.hgetall('index:conversation');
    let indexKeys = Object.keys(index);

    for (let key of indexKeys) {
        let keyParts = key.split(':');
        let type = keyParts[0];
        let network = keyParts[1];

        assert(type === 'group' || type === '1on1');
        assert(network === 'IRCNet' || network === 'MAS' ||  network === 'FreeNode' ||
            network === 'W3C' || network === 'Flowdock');

        if (type === '1on1') {
            let user1 = keyParts[2];
            let user2 = keyParts[3];

            assert(user1.charAt(0) === 'm' || user2.charAt(0) === 'm');
        }

        let conversation = yield redis.hgetall(`conversation:${index[key]}`);

        assert(conversation);
    }

    printVerdict('conversation:index', true);
}

function *conversationMembersTest() {
    let conversationKeys = yield redis.keys('conversation:*');
    let conversationMembersKeys = yield redis.keys('conversationmembers:*');

    assert(conversationKeys.length === conversationMembersKeys.length);

    for (let conversationKey of conversationKeys) {
        let conversationId = conversationKey.split(':')[1];
        let conversation = yield redis.hgetall(conversationKey);
        let members = yield redis.hgetall(`conversationmembers:${conversationId}`);

        assert(members);

        for (let userId of Object.keys(members)) {
            if (userId.charAt(0) === 'm') {
                assert((yield redis.exists(`user:${userId}`)));
            }
        }

        if (conversation.type === '1on1' && Object.keys(members).length !== 2) {
            console.log('Removing invalid 1on1, conversationId: ' + conversationId + '...');
            yield removeConversation(conversationId);
        }
    }

    printVerdict('conversationmembers', true);
}

function *conversationListTest() {
    let conversationListKeys = yield redis.keys('conversationlist:*');

    for (let conversationListKey of conversationListKeys) {
        let list = yield redis.smembers(conversationListKey);

        for (let conversationId of list) {
            let conversation = yield redis.hgetall(`conversation:${conversationId}`);

            assert(conversation);
        }
    }

    printVerdict('conversationlists', true);
}

function *oneOnOneHistoryTest() {
    let conversationHistoryKeys = yield redis.keys('1on1conversationhistory:*');

    for (let conversationHistoryKey of conversationHistoryKeys) {
        let list = yield redis.smembers(conversationHistoryKey);

        for (let conversationId of list) {
            let conversation = yield redis.hgetall(`conversation:${conversationId}`);

            if (!conversation) {
                console.log('Removing invalid 1on1conversationhistory entry...');
                yield redis.srem(conversationHistoryKey, conversationId);
            }
        }
    }

    printVerdict('1on1conversationhistory', true);
}

function *windowIndexTest() {
    let windowKeys = yield redis.keys('window:*');
    let windowIndexEntries = yield redis.hgetall('index:windowIds');

    let passed = windowKeys.length === Object.keys(windowIndexEntries).length;

    for (let entry of Object.keys(windowIndexEntries)) {
        let windowId = windowIndexEntries[entry];
        let userId = entry.split(':')[0];
        let conversationId = entry.split(':')[1];

        assert((yield redis.exists(`user:${userId}`)));

        let conversationExists = yield redis.exists(`conversation:${conversationId}`);

        if (!conversationExists) {
            console.log(`Removing orphan windowId: ${windowId}, userId: ${userId}`);

            yield redis.del(`window:${userId}:${windowId}`);
            yield redis.hdel('index:windowIds', `${userId}:${conversationId}`);
            yield redis.srem(`windowlist:${userId}`, windowId);
        }

        let windowExists = yield redis.exists(`window:${userId}:${windowId}`);

        if (!windowExists) {
            console.log(`Invalid windowlist entry, userId: ${userId}`);
        }

    }

    printVerdict('index:windowIds', passed);
}

function *windowTest() {
    let windowKeys = yield redis.keys('window:*');

    for (let windowKey of windowKeys) {
        let windowItem = yield redis.hgetall(windowKey);

        let userId = windowKey.split(':')[1];
        assert((yield redis.exists(`user:${userId}`)));

        assert((yield redis.exists(`conversation:${windowItem.conversationId}`)));
    }

    printVerdict('windows', true);
}

function *windowlistTest() {
    let windowListKeys = yield redis.keys('windowlist:*');

    for (let windowListKey of windowListKeys) {
        let userId = windowListKey.split(':')[1];
        assert((yield redis.exists(`user:${userId}`)));

        let windowIds = yield redis.smembers(windowListKey);

        for (let windowId of windowIds) {
            assert((yield redis.exists(`window:${userId}:${windowId}`)));
        }
    }

    printVerdict('windowlist', true);
}

function *friendsExistTest() {
    let friendsKeys = yield redis.keys('friends:*');

    for (let friendsKey of friendsKeys) {
        let friends = yield redis.smembers(friendsKey);

        for (let userId of friends) {
            let exists = yield redis.exists(`user:${userId}`);

            if (!exists) {
                console.log(`${friendsKeys} has non-existing friend ${userId}`);
            }
        }
    }

    printVerdict('friends', true);
}

function *desktopTest() {
    let windowKeys = yield redis.keys('window:*');

    for (let windowKey of windowKeys) {
        let masWindow = yield redis.hgetall(windowKey);

        if (masWindow.desktop !== null && isNaN(masWindow.desktop)) {
            console.log(`Fixing invalid window.desktop for ${windowKey}`);
            yield redis.hset(windowKey, 'desktop', 0);
        }
    }

    printVerdict('window.desktop', true);
}

function *activeDesktopTest() {
    let settingsKeys = yield redis.keys('settings:*');

    for (let settingsKey of settingsKeys) {
        let activeDesktop = yield redis.hget(settingsKey, 'activeDesktop');

        if (activeDesktop !== null) {
            let userId = settingsKey.split(':')[1];
            let windowKeys = yield redis.keys(`window:${userId}:*`);
            let found = false;

            for (let windowKey of windowKeys) {
                let desktop = yield redis.hget(windowKey, 'desktop');

                if (desktop === activeDesktop) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                console.log('ERROR: found invalid activeDesktop setting');
            }
        }
    }

    printVerdict('settings.activeDesktop', true);
}

function printVerdict(desc, passed) {
    console.log('Checking ' + desc + ': ' + (passed ? '[PASS]' : '[FAIL]'));
}

function *removeConversation(conversationId) {
    let conversation = yield redis.hgetall(`conversation:${conversationId}`);
    let members = yield redis.hgetall(`conversationmembers:${conversationId}`);

    yield redis.del(`conversation:${conversationId}`);
    yield redis.del(`conversationmsgs:${conversationId}`);
    yield redis.del(`conversationmembers:${conversationId}`);

    for (let userId of Object.keys(members)) {
        yield redis.srem(`conversationlist:${userId}`, conversationId);
    }

    let key;

    if (conversation.type === 'group') {
        key = 'group:' + conversation.network + ':' + conversation.name;
    } else {
        let userIds = Object.keys(members);
        userIds = userIds.sort();
        key = '1on1:' + conversation.network + ':' + userIds[0] + ':' + userIds[1];
    }

    yield redis.hdel('index:conversation', key);
}
