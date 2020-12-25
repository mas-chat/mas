const utils = require('../../utils');

module.exports = {
  'Load front page': browser => {
    browser.url('http://localhost:2222').waitForElementVisible('body').assert.containsText('button', 'Sign In').end();
  },

  tearDown: utils.tearDown
};
