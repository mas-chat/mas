// let chai = require('chai');
// let expect = chai.expect;

let User = require('../models/user');

describe('User', function() {
    describe('constructor', function() {
        it('should have a default name', function(done) {
            let user = new User({ email: 'iao@iki.fi' });
            user.get('maxwindows', function() {
                console.log('done');
                done();
            });
        });
    });
});
