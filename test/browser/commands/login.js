
'use strict';

exports.command = function(nick, password) {
    let browser = this;

    browser
        .url('http://localhost:44199')
        .waitForElementVisible('body', 3000)
        .setValue('input[name="username"]', nick)
        .setValue('input[name="password"]', password)
        .click('#login-form button')
        .waitForElementVisible('.fa-wrench', 3000);

    return this;
};
