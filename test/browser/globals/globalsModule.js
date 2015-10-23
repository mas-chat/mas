
'use strict';

module.exports = {
    local: {
        dontReportSauceLabs: true
    },

    waitForConditionTimeout: 12000,

    after: function(done) {
        setTimeout(function() {
            // Some of the MAS server libs don't exit cleanly because of Redis connections
            process.exit(0);
        }, 1000);

        done();
    }
};
