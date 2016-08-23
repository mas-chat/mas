'use strict';

const User = require('../../../models/user.js');

exports.command = function(options = {}) {
    let browser = this;

    browser
        .perform(function(client, done) {
            // Defaults
            let values = {
                name: 'Joe Random',
                email: 'user@mas.com',
                inUse: 'true',
                password: '123456',
                nick: 'user1'
            };

            Object.keys(options).forEach(function(key) {
                values[key] = options[key];
            });

            (async () => {
                await User.create(values);

                done();
            })();
        });

    return this;
};
