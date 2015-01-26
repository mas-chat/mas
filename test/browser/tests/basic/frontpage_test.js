
'use strict';

let utils = require('../../utils');

module.exports = {
    'Load front page': function(browser) {
        browser
            .url('http://localhost:44199')
            .waitForElementVisible('body', 3000)
            .assert.containsText('.login', 'Sign in')
            .end();
    },

    tearDown: utils.tearDown
};
