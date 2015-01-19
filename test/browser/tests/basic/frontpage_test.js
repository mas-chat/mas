
module.exports = {
    "Load front page" : function (browser) {
        browser
            .url("http://localhost:3200")
            .waitForElementVisible('body', 1000)
            .assert.containsText('.login', 'Sign in')
            .end();
    }
};
