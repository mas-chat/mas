// var chai = require('chai');
// var expect = chai.expect;

var User = require('../models/user');

describe('User', function() {
    describe('constructor', function() {
        it('should have a default name', function(done) {
            var user = new User({ email: 'iao@iki.fi' });
            user.get('maxwindows', function() {
                console.log('done');
                done();
            });
        });
    });
});
