var request = require('superagent');

module.exports = {
    "Load front page": function(browser) {
        browser
            .url("http://localhost:44199")
            .waitForElementVisible('body', 1000)
            .assert.containsText('.login', 'Sign in')
            .end();
    },

    tearDown: function(callback) {
        var userName = this.client.options.username;
        var accessKey = this.client.options.access_key;

        if (userName && accessKey) {
            request
                .put('https://saucelabs.com/rest/v1/' + userName + '/jobs/' + this.client.sessionId)
                .send({ passed: true })
                .auth(userName, accessKey)
                .end(function(error, res){
                    if (error) {
                        console.log('ERROR sending verdict');
                        console.log(error);
                    } else {
                        console.log('Verdict sent to Sauce Labs, response:' + res.res.statusMessage);
                    }
                });
        }
    }
};
