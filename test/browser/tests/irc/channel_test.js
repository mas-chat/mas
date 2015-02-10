
'use strict';

const irc = require('irc'),
      utils = require('../../utils');

let client;

module.exports = {
    'Basic IRC messaging': function(browser) {
        browser
            .createUser()
            .perform(function(client, done) {
                client = new irc.Client('localhost', 'ircuser', {
                    channels: [ '#test' ]
                });

                client.addListener('join#test', function() {
                    // Greet everybody who joins
                    client.say('#test', 'welcome!');
                    done();
                });

                client.addListener('message', function(from, to, message) {
                    // Respond pong if somebody says ping
                    if (message === 'ping') {
                        client.say(to, 'pong');
                    }
                });

                client.addListener('message', function(from, to, message) {
                    if (message === 'ping1on1') {
                        client.say(from, 'pong1on1');
                    }
                });
            })

            // Open Join IRC channel modal
            .login('user1', '123456')
            .click('.lower-sidebar .fa-plus')
            .useXpath()
            .click('//a[text()="Join IRC channel…"]')
            .useCss()

            // Join #test IRC channel
            .waitForElementVisible('.modal-content', 3000)
            .setValue('input#join_irc_name', '#test')
            .click('.modal-content .btn-primary')

            // Verify that the join is acknowledged by the bot
            .useXpath()
            .waitForElementVisible('//*[contains(text(), "welcome!")]', 5000)
            .useCss()

            // Request pong
            .setValue('.window:not(.irc-server-window) input', [ 'ping', browser.Keys.ENTER ])

            // Very that bot's pong reply gets delivered
            .useXpath()
            .waitForElementVisible('//*[contains(text(), "pong")]', 5000)
            .useCss()

            // Receive msg from an another IRC user. Window not open
            .setValue('.window:not(.irc-server-window) input', [ 'ping1on1', browser.Keys.ENTER ])
            .useXpath()
            .waitForElementVisible('//*[contains(text(), "pong1on1")]', 5000)
            .useXpath()
            .end();
    },

    tearDown: utils.tearDown
};
