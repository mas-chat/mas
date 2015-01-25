
var util = require('util');
var request = require('superagent');

module.exports = {
    local: {
        dontReportSauceLabs: true
    },

    reporter: function(results, done) {
        var passed = results.failed === 0 && results.errors === 0;
        console.log('Final result: "{ passed: ' + passed + ' }"');

        if (!this.dontReportSauceLabs) {
            var userName = this.client.options.username;
            var accessKey = this.client.options.accessKey;
            var baseUrl = 'https://saucelabs.com/rest/v1/';

            console.log('Sending final result to Saucelabs...');

            if (userName && accessKey) {
                request
                    .put(baseUrl + userName + '/jobs/' + this.client.sessionId)
                    .send({ passed: true })
                    .auth(userName, accessKey)
                    .end(function(error, res){
                        if (error) {
                            console.log('ERROR sending verdict');
                            console.log(error);
                        } else {
                            console.log('Verdict sent to Sauce Labs, response:' +
                                res.res.statusMessage);
                        }
                        done();
                    });
            } else {
                console.log('Username or access key missing, username: ' + userName);
                done();
            }
        } else {
            console.log('Local testing. Not notifying Saucelabs.');
        }
    }
};
