'use strict';

require('co-mocha');

const proxyquire =  require('proxyquire'),
      sinon = require('sinon'),
      chai = require('chai'),
      sinonChai = require('sinon-chai'),
      expect = require('chai').expect;

chai.use(sinonChai);

let Model;
let Customer;
let rigiddbStub;

describe('Model', function() {
    beforeEach(function() {
        rigiddbStub = sinon.stub();
        Model = proxyquire('../../models/model', { 'rigiddb': rigiddbStub });
        Customer = class Customer extends Model {};
    });

    it('create() succeeds', function*() {
        rigiddbStub.prototype.create = function*(db, props) {
            expect(db).to.equal('customers');
            expect(props).to.deep.equal({
                name: 'Ilkka'
            });

            return { val: 1, err: false }
        };

        const customerObj = yield Customer.create({ name: 'Ilkka' });

        expect(customerObj).to.deep.equal({
            collection: 'customers',
            _props: { name: 'Ilkka' },
            errors: {},
            id: 1
        });
    });

    it('create() fails, index error, no descriptions', function*() {
        rigiddbStub.prototype.create = function*(db, props) {
            expect(db).to.equal('customers');
            expect(props).to.deep.equal({
                name: 'Ilkka'
            });

            return { err: 'notUnique', val: false, indices: [ 'first', 'third' ] };
        };

        const customerObj = yield Customer.create({ name: 'Ilkka' });

        expect(customerObj).to.deep.equal({
            collection: 'customers',
            _props: {},
            errors: {
                first: 'Bad index.',
                third: 'Bad index.'
            },
            id: null
        });
    });

    it('create() fails, index error, descriptions are set', function*() {
        Customer = class Customer extends Model {
            get config() {
                return {
                    indexErrorDescriptions: {
                        first: 'This is already reserved.',
                        third: 'This is already used.'
                    }
                };
            }
        };

        rigiddbStub.prototype.create = function*(db, props) {
            return { err: 'notUnique', val: false, indices: [ 'first', 'third' ] }
        };

        const customerObj = yield Customer.create({
            name: 'Ilkka'
        });

        expect(customerObj).to.deep.equal({
            collection: 'customers',
            _props: {},
            errors: {
                first: 'This is already reserved.',
                third: 'This is already used.'
            },
            id: null
        });
    });

    it('set() succeeds', function*() {
        rigiddbStub.prototype.create = function*(db, props) {
            return { val: 1, err: false }
        };

        rigiddbStub.prototype.update = function*(db, id, props) {
            expect(db).to.equal('customers');
            expect(id).to.equal(1);
            expect(props).to.deep.equal({
                name: 'Tyrion'
            });

            return { val: true, err: false }
        };

        const customerObj = yield Customer.create({ name: 'Ilkka' });
        let res = yield customerObj.set({ name: 'Tyrion' });

        expect(res).to.deep.equal({ name: 'Tyrion' })

        expect(customerObj).to.deep.equal({
            collection: 'customers',
            _props: { name: 'Tyrion' },
            errors: {},
            id: 1
        });
    });

    it('set() fails, index error, no descriptions', function*() {
        rigiddbStub.prototype.create = function*(db, props) {
            return { val: 1, err: false }
        };

        rigiddbStub.prototype.update = function*(db, id, props) {
            return { val: false, err: 'notUnique', indices: [ 'name' ] }
        };

        const customerObj = yield Customer.create({ name: 'Ilkka' });
        let res = yield customerObj.set({ name: 'Tyrion' });

        expect(customerObj).to.deep.equal({
            collection: 'customers',
            _props: { name: 'Ilkka' },
            errors: {
                name: 'Bad index.'
            },
            id: 1
        });
    });

    it('setProperty() fails, forbidden property', function*() {
        Customer = class Customer extends Model {
            get config() {
                return {
                    allowedProps: [ 'age' ]
                };
            }
        };

        rigiddbStub.prototype.create = function*(db, props) {
            return { val: 1, err: false }
        };

        rigiddbStub.prototype.update = function*(db, id, props) {
            return { val: false, err: 'notUnique', indices: [ 'name' ] }
        };

        const customerObj = yield Customer.create({ name: 'Ilkka' });
        const callback = sinon.spy();

        try {
            yield customerObj.setProperty({ name: 'Tyrion' });
        } catch(e) {
            expect(e.message).to.equal('Tried to set invalid user model property name');
            callback();
        }

        expect(callback).to.have.been.called;
    });

    it('findFirst() succeeds', function*() {
        rigiddbStub.prototype.find = function*(db, props) {
            expect(db).to.equal('customers');
            expect(props).to.deep.equal({ name: 'Ilkka' });

            return { val: [ 42 ], err: false };
        };

        rigiddbStub.prototype.get = function*(db, id) {
            expect(db).to.equal('customers');
            expect(id).equal(42);

            return { val: { name: 'Ilkka', age: 36 }, err: false };
        };

        const customerObj = yield Customer.findFirst('Ilkka', 'name');

        expect(customerObj).to.deep.equal({
            collection: 'customers',
            _props: { name: 'Ilkka', age: 36 },
            errors: {},
            id: 42
        });
    });


    it('find() succeeds', function*() {
        rigiddbStub.prototype.find = function*(db, props) {
            expect(db).to.equal('customers');
            expect(props).to.deep.equal({ name: 'Ilkka' });

            return { val: [ 42, 43 ], err: false };
        };

        let expectedId = 42
        let age = 34;

        rigiddbStub.prototype.get = function*(db, id) {
            expect(db).to.equal('customers');
            expect(id).equal(expectedId++);

            return { val: { name: 'Ilkka', age: age++ }, err: false };
        };

        const customerObjs = yield Customer.find('Ilkka', 'name');

        expect(customerObjs).to.deep.equal([{
            collection: 'customers',
            _props: { name: 'Ilkka', age: 34 },
            errors: {},
            id: 42
        }, {
            collection: 'customers',
            _props: { name: 'Ilkka', age: 35 },
            errors: {},
            id: 43
        }]);
    });
});
