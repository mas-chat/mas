'use strict';

const irc = require('irc'); // eslint-disable-line import/no-unresolved
const utils = require('../../utils');

module.exports = {
    'Basic IRC messaging': browser => {
        browser
            .createUser()
            .perform((client, done) => {
                const ircClient = new irc.Client('localhost', 'ircuser', {
                    channels: [ '#test' ]
                });

                ircClient.addListener('join#test', () => {
                    // Greet everybody who joins
                    ircClient.say('#test', 'whats up!');
                    done();
                });

                ircClient.addListener('message', (from, to, message) => {
                    // Respond pong if somebody says ping
                    if (message === 'ping') {
                        ircClient.say(to, 'pong');
                    }
                });

                ircClient.addListener('message', (from, to, message) => {
                    if (message === 'ping1on1') {
                        ircClient.say(from, 'pong1on1');
                    }
                });
            })

            // Open Join IRC channel modal
            .login('user1', '123456')
            .click('.lower-sidebar .fa-plus')
            .useXpath()
            .click('//a[contains(text(), "Join IRC channel")]')
            .useCss()

            // Join #test IRC channel
            .waitForElementVisible('.modal-dialog')
            .setValue('input#join_irc_name', '#test')
            .setValue('select#join_irc_network', 'IRCnet')
            .click('button.modal-proceed')

            .waitForElementVisible('.window:not(.irc-server-window')

            // Request pong
            .setValue('.window:not(.irc-server-window) textarea', [ 'ping', browser.Keys.ENTER ])

            // Request pong on 1on1 window
            .setValue('.window:not(.irc-server-window) textarea',
                [ 'ping1on1', browser.Keys.ENTER ])

            // Verify that the join and pings were acknowledged by the bot
            .useXpath()
            .waitForElementVisible('//*[contains(., "pong")]')
            .waitForElementVisible('//*[contains(., "pong1on1")]')
            .waitForElementVisible('//*[contains(., "whats up")]')

            .end();
    },

    tearDown: utils.tearDown
};
