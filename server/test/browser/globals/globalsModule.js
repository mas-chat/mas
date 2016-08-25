'use strict';

module.exports = {
    local: {
        dontReportSauceLabs: true
    },

    waitForConditionTimeout: 12000,

    after: done => {
        // Some of the MAS server libs don't exit cleanly because of Redis connections
        setTimeout(() => process.exit(0), 1000);
        done();
    }
};
