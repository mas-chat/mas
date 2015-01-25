
module.exports = {
    "Load front page": function(browser) {
        browser
            .url("http://localhost:44199")
            .waitForElementVisible('body', 1000)
            .assert.containsText('.login', 'Sign in')
            .end();
    }
};
