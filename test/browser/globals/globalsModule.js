
'use strict';

let co = require('co'),
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

    after: function(done) {
        setTimeout(function() {
            // Some of the MAS server libs don't exit cleanly because of Redis connections
            process.exit(0);
        }, 1000);

        done();
    }
};
