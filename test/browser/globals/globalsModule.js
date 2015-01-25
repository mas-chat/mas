
var co = require('co'),
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
    }
};
