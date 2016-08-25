'use strict';

const utils = require('../../utils');

module.exports = {
    'Register new user': browser => {
        browser
            .url('http://localhost:2222/')
            .waitForElementVisible('body')
            .click('#main > div > section > div > a')
            .assert.elementPresent('form')
            .setValue('#main form > span:nth-child(2) input', 'Ilkka Oksanen')
            .setValue('#main form > span:nth-child(3) input', 'iao@iki.fi')
            .setValue('#main form > span:nth-child(4) input', 'dj3nsd4dse')
            .setValue('#main form > span:nth-child(5) input', 'dj3nsd4dse')
            .setValue('#main form > span:nth-child(6) input', 'ilkka')
            .click('#main form > span:nth-child(7) input')
            .click('#main form > p > button.button.is-primary')
            .waitForElementVisible('.main-welcome-msg')
            .logout()
            .login('iao@iki.fi', 'dj3nsd4dse')
            .end();
    },

    tearDown: utils.tearDown
};
