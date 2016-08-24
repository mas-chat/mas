
'use strict';

let utils = require('../../utils');

module.exports = {
    'Load front page': function(browser) {
        browser
            .url('http://localhost:2222')
            .waitForElementVisible('body')
            .assert.containsText('button', 'Login')
            .end();
    },

    tearDown: utils.tearDown
};
