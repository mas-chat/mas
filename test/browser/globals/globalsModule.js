
var request = require('superagent'),
    co = require('co'),
    redisModule = require('../../../server/lib/redis'),
    redis = redisModule.createClient();

module.exports = {
    local: {
        dontReportSauceLabs: true
    },

    before: function(done) {
        co(function*() {
            // Clear redis database
            yield redis.flushdb();
            yield redis.quit();

            yield redisModule.initDB();
            done();
        })();
    },

    reporter: function(results, done) {
        var passedStatus = results.failed === 0 && results.errors === 0;
        console.log('Final result: "{ passed: ' + passedStatus + ' }"');

        if (!this.client.globals.dontReportSauceLabs) {
            var userName = this.client.options.username;
            var accessKey = this.client.options.accessKey;
            var sessionId =this.client.sessionId;
            var baseUrl = 'https://saucelabs.com/rest/v1/';

            console.log('Sending final result to Saucelabs...');

            if (userName && accessKey) {
                request
                    .put(baseUrl + userName + '/jobs/' + sessionId)
                    .send({ passed: passedStatus })
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
