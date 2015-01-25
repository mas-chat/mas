
let utils = require('../../utils');

module.exports = {
    'Register new user': function(browser) {
        browser
            .url('http://localhost:44199/register')
            .waitForElementVisible('body', 1000)
            .assert.title('MAS - Register')
            .assert.elementPresent('form[action="/register"]')
            .setValue('input#id_name', 'Ilkka Oksanen')
            .setValue('input#id_email', 'iao@iki.fi')
            .setValue('input#id_password', 'dj3nsd4dse')
            .setValue('input#id_confirm', 'dj3nsd4dse')
            .setValue('input#id_nick', 'ilkka')
            .click('input#id_tos')
            .click('#register-form button')
            .waitForElementVisible('.main-welcome-msg', 1000)
            .logout()
            .login('iao@iki.fi', 'dj3nsd4dse')
            .end();
    },

    tearDown: utils.tearDown
};
