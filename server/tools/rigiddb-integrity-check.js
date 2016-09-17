'use strict';

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

const REVISION = 1;

const store = new RigidDB('mas', REVISION, { db: 10 });
const allUserIds = [];
const activeUserIds = [];
const conversations = [];

main();

process.on('unhandledRejection', (reason, p) => {
    log(`Unhandled Rejection at: Promise ${p}, reason: ${reason}`);
    throw reason;
});

async function main() {
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

    log('Done.');
    await store.quit();
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
            log(`Conversation has deleted user as an owner: ${JSON.stringify(conversation._props)}`);
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
            log('Found window that belongs to deleted user');
        }

        if (!conversations.find(
            existingConversationId => existingConversationId === conversationId)) {
            log('Found window without conversation');
        }
    }
}

async function checkConversationMembers() {
    const { val: conversationMemberIds } = await store.list('conversationMembers');

    log('Checking conversationMembers...');
    log(`${conversationMemberIds.length} conversationMembers found.`);

    for (const conversationMemberId of conversationMemberIds) {
        const conversationMember = await ConversationMember.fetch(conversationMemberId);
        const userGId = UserGId.create(conversationMember.get('userGId'));
        const conversationId = conversationMember.get('conversationId');

        if (userGId.type === 'mas') {
            if (!activeUserIds.find(activeUserId => activeUserId === userGId.id)) {
                log('Found conversationMember that is a deleted user. Fixing');

                await conversationMember.delete();
            }
        }

        if (!conversations.find(
            existingConversationId => existingConversationId === conversationId)) {
            log('Found conversationMember that points to non-existent conversation');
        }
    }
}

async function checkSettings() {
    log('Checking that all users have settings...');

    for (const userId of activeUserIds) {
        const settings = await Settings.findFirst({ userId });

        if (!settings) {
            log(`User ${userId} doesn't have settings. Fixing`);
            await Settings.create({ userId });
        }
    }

    log('Checking that settings belong to active users...');

    const { val: settingIds } = await store.list('settings');

    log(`${settingIds.length} settings found.`);

    for (const settingId of settingIds) {
        const settings = await Settings.fetch(settingId);

        const userId = settings.get('userId');

        if (!activeUserIds.find(activeUserId => activeUserId === userId)) {
            log('Found settings that belongs to deleted user');
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
            log('Found friendUserId that belongs to deleted user');
        }

        if (!activeUserIds.find(activeUserId => activeUserId === dstUserId)) {
            log('Found friendUserId that belongs to deleted user');
        }

        const counterFried = await Friend.findFirst({ srcUserId: dstUserId, dstUserId: srcUserId });

        if (!counterFried) {
            log(`Friendship ${JSON.stringify(friend._props)} doesn't have counter friend object. Fixing by deleting.`);
            await friend.delete();
        }
    }
}

async function checkConversationMessages() {
    log('Checking conversationMessage objects are valid...');

    const { val: conversationMessageIds } = await store.list('conversationMessages');

    log(`${conversationMessageIds.length} conversationMessage objects found.`);

    for (const conversationMessageId of conversationMessageIds) {
        const conversationMessage = await ConversationMessage.fetch(conversationMessageId);
        const conversationId = conversationMessage.get('conversationId');
        const userGIdString = conversationMessage.get('userGId');

        if (!conversations.find(
            existingConversationId => existingConversationId === conversationId)) {
            log(`Found conversationMessage ${JSON.stringify(conversationMessage._props)} that points to non-existent conversation. Fixing by deleting.`);
            await conversationMessage.delete();
            continue;
        }

        if (userGIdString) {
            const userGId = UserGId.create(userGIdString);

            if (userGId.type === 'mas') {
                if (!allUserIds.find(userId => userId === userGId.id)) {
                    log(`Found message ${JSON.stringify(conversationMessage._props)} that belongs to non-existent user. Fixing by deleting.`);
                    await conversationMessage.delete();
                }
            } else {
                const decoded = new Buffer(userGId.id, 'base64').toString('ascii');

                if (decoded.indexOf('!') === -1) {
                    log(`Found corrupted IRC userGId: ${userGId.id}, decoded: ${decoded}`);
                }
            }
        }
    }
}

async function checkNetworkInfos() {
    log('Checking networkInfo objects are valid...');

    const { val: networkInfoIds } = await store.list('networkInfos');

    for (const networkInfoId of networkInfoIds) {
        const networkInfo = await NetworkInfo.fetch(networkInfoId);

        if (!allUserIds.find(userId => userId === networkInfo.get('userId'))) {
            log('Found networkInfo that belongs to non-existent user.');
        }
    }
}

function log(msg) {
    console.log(msg); // eslint-disable-line no-console
}
