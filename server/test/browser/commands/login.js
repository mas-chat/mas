
'use strict';

exports.command = function(nick, password) {
    let browser = this;

    browser
        .url('http://localhost:2222')
        .waitForElementVisible('body', 3000)
        .click('#main > div > div > span.nav-item > button')
        .setValue('#username', nick)
        .setValue('#password', password)
        .click('#main > div > div.modal.is-active button.button.is-primary')
        .waitForElementVisible('.fa-wrench', 5000);

    return this;
};
