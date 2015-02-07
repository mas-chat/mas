
'use strict';

let request = require('superagent');

exports.tearDown = function(done) {
    let passedStatus = this.results.failed === 0 && this.results.errors === 0;
    console.log('Final result: "{ passed: ' + passedStatus + ' }"');

    if (!this.client.globals.dontReportSauceLabs) {
        let userName = this.client.options.username;
        let accessKey = this.client.options.accessKey;
        let sessionId = this.client.sessionId;
        let baseUrl = 'https://saucelabs.com/rest/v1/';

        console.log('Sending final result to Saucelabs...');

        if (userName && accessKey) {
            request
            .put(baseUrl + userName + '/jobs/' + sessionId)
            .send({ passed: passedStatus })
            .auth(userName, accessKey)
            .end(function(error, res) {
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
        done();
    }
};
