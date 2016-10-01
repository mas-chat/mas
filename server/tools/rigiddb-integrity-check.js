'use strict';

const readline = require('readline');
const RigidDB = require('rigiddb');
const User = require('../models/user');
const Conversation = require('../models/conversation');
const ConversationMember = require('../models/conversationMember');
const ConversationMessage = require('../models/conversationMessage');
const Window = require('../models/window');
const Friend = require('../models/friend');
const Settings = require('../models/settings');
const UserGId = require('../models/userGId');
const NetworkInfo = require('../models/networkInfo');
const IRCSubscription = require('../models/ircSubscription');

const REVISION = 1;

const store = new RigidDB('mas', REVISION, { db: 10 });
const allUserIds = [];
const activeUserIds = [];
const conversations = [];
let fix = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

process.on('unhandledRejection', (reason, p) => {
    log(`Unhandled Rejection at: Promise ${p}, reason: ${reason}`);
    throw reason;
});

(async function main() {
    log('');
    log('*** Last line of defence, only needed in special cases ***');
    log('');

    fix = question('Fix issues in addition to reporting them [yes/NO]? ') === 'yes';

    const { val: userIds } = await store.list('users');

    log(`${userIds.length} users found.`);

    for (const userId of userIds) {
        const user = await User.fetch(userId);
        allUserIds.push(userId);

        if (!user.get('deleted')) {
            activeUserIds.push(userId);
        }
    }

    log(`${activeUserIds.length} active users found.`);

    await checkConversations();
    await checkWindows();
    await checkConversationMembers();
    await checkSettings();
    await checkFriends();
    await checkConversationMessages();
    await checkNetworkInfos();
    await checkIRCSubscriptions();

    log('Done.');
    await store.quit();
}());

async function question(label) {
    return new Promise(resolve => rl.question(label, answer => resolve(answer)));
}

async function checkConversations() {
    const { val: conversationIds } = await store.list('conversations');

    log('Checking that conversations have active user as an owner...');
    log(`${conversationIds.length} conversations found.`);

    for (const conversationId of conversationIds) {
        conversations.push(conversationId);

        const conversation = await Conversation.fetch(conversationId);
        const ownerUserId = conversation.get('owner');

        if (ownerUserId && !activeUserIds.find(activeUserId => activeUserId === ownerUserId)) {
            log(`!!! Conversation has deleted user as an owner: ${JSON.stringify(conversation._props)}`);
        }

        if (conversation.get('type') === '1on1') {
            const members = await ConversationMember.find({ conversationId: conversation.id });

            if (members.length !== 2) {
                log(`!!! 1on1 conversation has invalid amount of members: ${members.length}`);
                members.forEach(member => {
                    log(`    - ${member.get('userGId')}`);
                });

                if (fix) {
                    await members[0].delete();
                    await conversation.delete();
                }
            } else if (members[0].get('userGId') === members[1].get('userGId')) {
                log('!!! 1on1 conversation where user is talking with himself');
            } else if (members[0].get('userGId')[0] === 'i' && members[1].get('userGId')[0] === 'i') {
                log('!!! 1on1 conversation where two irc users are talking');
            }
        }
    }
}

async function checkWindows() {
    const { val: windowIds } = await store.list('windows');

    log('Checking windows...');
    log(`${windowIds.length} windows found.`);

    for (const windowId of windowIds) {
        const window = await Window.fetch(windowId);
        const userId = window.get('userId');
        const conversationId = window.get('conversationId');

        if (!activeUserIds.find(activeUserId => activeUserId === userId)) {
            log('!!! Found window that belongs to deleted user');

            if (fix) {
                log('Fixing by deleting');
                await window.delete();
            }
        }

        if (!conversations.find(
            existingConversationId => existingConversationId === conversationId)) {
            log('!!! Found window without conversation');

            if (fix) {
                log('Fixing by deleting');
                await window.delete();
            }
        }
    }
}

async function checkConversationMembers() {
    const { val: conversationMemberIds } = await store.list('conversationMembers');

    log('Checking conversationMembers...');
    log(`${conversationMemberIds.length} conversationMembers found.`);

    for (const conversationMemberId of conversationMemberIds) {
        const conversationMember = await ConversationMember.fetch(conversationMemberId);

        if (!conversationMember) {
            // Active user, has parted already
            continue;
        }

        const role = conversationMember.get('role');

        const userGId = UserGId.create(conversationMember.get('userGId'));
        const conversationId = conversationMember.get('conversationId');

        if (!(role === 'u' || role === '+' || role === '@' || role === '*')) {
            log(`!!! Unknown role ${role}, userGId: ${userGId}`);

            if (fix) {
                await conversationMember.set('role', 'u');
            }
        }

        if (!(role === 'u' || role === '+' || role === '@' || role === '*')) {
            log(`!!! Unknown role ${role}, userGId: ${userGId}`);

            if (fix) {
                await conversationMember.set('role', 'u');
            }
        }

        if (userGId.type === 'mas') {
            if (!activeUserIds.find(activeUserId => activeUserId === userGId.id)) {
                log('!!! Found conversationMember that is a deleted user.');

                if (fix) {
                    log('Fixing');
                    await conversationMember.delete();
                }
            }
        }

        if (!conversations.find(
            existingConversationId => existingConversationId === conversationId)) {
            log('!!! Found conversationMember that points to non-existent conversation');

            if (fix) {
                log('Fixing by deleting');
                await conversationMember.delete();
            }
        }
    }
}

async function checkSettings() {
    log('Checking that all users have settings...');

    for (const userId of activeUserIds) {
        const settings = await Settings.findFirst({ userId });

        if (!settings) {
            log(`!!! User ${userId} doesn't have settings.`);

            if (fix) {
                log('Fixing by creating');
                await Settings.create({ userId });
            }
        }
    }

    log('Checking that settings belong to active users...');

    const { val: settingIds } = await store.list('settings');

    log(`${settingIds.length} settings found.`);

    for (const settingId of settingIds) {
        const settings = await Settings.fetch(settingId);

        const userId = settings.get('userId');

        if (!activeUserIds.find(activeUserId => activeUserId === userId)) {
            log('!!! Found settings that belongs to deleted user');

            if (fix) {
                log('Fixing by deleting');
                await settings.delete();
            }
        }
    }
}

async function checkFriends() {
    log('Checking friend objects are valid...');

    const { val: friendIds } = await store.list('friends');

    log(`${friendIds.length} friend objects found.`);

    const srcFriends = [];
    const dstFriends = [];

    for (const friendId of friendIds) {
        const friend = await Friend.fetch(friendId);

        const srcUserId = friend.get('srcUserId');
        srcFriends.push(srcUserId);

        const dstUserId = friend.get('dstUserId');
        dstFriends.push(dstUserId);

        if (!activeUserIds.find(activeUserId => activeUserId === srcUserId)) {
            log('!!! Found friendUserId that belongs to deleted user');
        }

        if (!activeUserIds.find(activeUserId => activeUserId === dstUserId)) {
            log('!!! Found friendUserId that belongs to deleted user');
        }

        const counterFried = await Friend.findFirst({ srcUserId: dstUserId, dstUserId: srcUserId });

        if (!counterFried) {
            log(`!!! Friendship ${JSON.stringify(friend._props)} doesn't have counter friend object.`);

            if (fix) {
                log('Fixing by deleting.');
                await friend.delete();
            }
        }
    }
}

async function checkConversationMessages() {
    log('Checking conversationMessage objects are valid...');

    const { val: conversationMessageIds } = await store.list('conversationMessages');

    log(`${conversationMessageIds.length} conversationMessage objects found.`);

    for (const conversationMessageId of conversationMessageIds) {
        const conversationMessage = await ConversationMessage.fetch(conversationMessageId);

        if (!conversationMessage) {
            // Active group, old message was just deleted
            continue;
        }

        const conversationId = conversationMessage.get('conversationId');
        const userGIdString = conversationMessage.get('userGId');

        if (!conversations.find(
            existingConversationId => existingConversationId === conversationId)) {
            log(`!!! Found conversationMessage ${JSON.stringify(conversationMessage._props)} that points to non-existent conversation.`);

            if (fix) {
                log('Fixing by deleting.');
                await conversationMessage.delete();
            }

            continue;
        }

        if (userGIdString) {
            const userGId = UserGId.create(userGIdString);

            if (userGId.type === 'mas') {
                if (!allUserIds.find(userId => userId === userGId.id)) {
                    log(`!!! Found message ${JSON.stringify(conversationMessage._props)} that belongs to non-existent user.`);

                    if (fix) {
                        log('Fixing by deleting.');
                        await conversationMessage.delete();
                    }
                }
            }
        }
    }
}

async function checkNetworkInfos() {
    log('Checking networkInfo objects are valid...');

    const { val: networkInfoIds } = await store.list('networkInfos');

    const validNetworks = [ 'mas', 'ircnet', 'freenode', 'w3c' ];

    for (const networkInfoId of networkInfoIds) {
        const networkInfo = await NetworkInfo.fetch(networkInfoId);

        if (!validNetworks.includes(networkInfo.get('network'))) {
            log(`!!! Invalid network ${networkInfo.get('network')} found`);

            if (fix) {
                await networkInfo.delete();
                continue;
            }
        }

        if (!allUserIds.find(userId => userId === networkInfo.get('userId'))) {
            log('!!! Found networkInfo that belongs to non-existent user.');
        }
    }
}

async function checkIRCSubscriptions() {
    log('Checking ircSubscription objects are valid...');

    const { val: ircSubscriptionIds } = await store.list('ircSubscriptions');

    const validNetworks = [ 'mas', 'ircnet', 'freenode', 'w3c' ];

    for (const ircSubscriptionId of ircSubscriptionIds) {
        const subscription = await IRCSubscription.fetch(ircSubscriptionId);

        if (!validNetworks.includes(subscription.get('network'))) {
            log(`!!! Invalid network ${subscription.get('network')} found`);
        }
    }
}


function log(msg) {
    console.log(msg); // eslint-disable-line no-console
}
