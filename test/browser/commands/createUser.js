
'use strict';

const co = require('co'),
      User = require('../../../server/models/user.js');

exports.command = function(options) {
    let browser = this;

    options = options || {};

    browser
        .perform(function(client, done) {
            // Defaults
            let values = {
                name: 'Joe Random',
                email: 'user@mas.com',
                inuse: 'true',
                password: 'plain:123456',
                nick: 'user1'
            };

            Object.keys(options).forEach(function(key) {
                values[key] = options[key];
            });

            co(function*() {
                let user = new User(values, {}, []);
                yield user.generateUserId();
                yield user.save();

                done();
            })();
        });

    return this;
};
