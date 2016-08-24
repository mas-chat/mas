/* globals describe, it */

'use strict';

const expect = require('chai').expect;
//const userValidator = require('../../validators/user.js');

xdescribe('UserValidator', () => {
    it('name, email, and password fails', () => {
        const res = userValidator.validate({
            name: 'Ilkka',
            email: 'foobar',
            password: '12345'
        });

        expect(res).to.deep.equal({
            valid: false,
            errors: {
                email: 'Please enter a valid email address.',
                name: 'Please enter at least 6 characters.'
            }
        });
    });

    it('nick fails because too short', () => {
        const res = userValidator.validate({
            nick: 'io'
        });

        expect(res).to.deep.equal({
            valid: false,
            errors: {
                nick: 'Nick has to be 3-15 characters long.'
            }
        });
    });

    it('nick fails because too long', () => {
        const res = userValidator.validate({
            nick: 'a234567890123456'
        });

        expect(res).to.deep.equal({
            valid: false,
            errors: {
                nick: 'Nick has to be 3-15 characters long.'
            }
        });
    });

    it('nick fails because of starting digit', () => {
        const res = userValidator.validate({
            nick: '2ilkka'
        });

        expect(res).to.deep.equal({
            valid: false,
            errors: {
                nick: 'Nick can\'t start with digit'
            }
        });
    });

    it('nick fails because of illegal character', () => {
        const res = userValidator.validate({
            nick: 'il#kka'
        });

        expect(res).to.deep.equal({
            valid: false,
            errors: {
                nick: 'Illegal characters, allowed are a-z, 0-9, [, ], \\, `, _, ^, {, |, }'
            }
        });
    });

    it('all fields succeeds', () => {
        const res = userValidator.validate({
            name: 'IlkkaO',
            nick: 'ilkka_',
            email: 'iao@iki.fi',
            password: '123456'
        });

        expect(res).to.deep.equal({
            valid: true,
            errors: {}
        });
    });
});
