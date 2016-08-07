/* globals describe, it, beforeEach */

'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = require('chai').expect;

chai.use(sinonChai);

let Model;
let Customer;
let rigiddbStub;

describe('Model', () => {
    beforeEach(() => {
        rigiddbStub = sinon.stub();
        Model = proxyquire('../../models/model', { rigiddb: rigiddbStub });
        Customer = class Customers extends Model {};
    });

    it('create() succeeds', async () => {
        rigiddbStub.prototype.create = function create(db, props) {
            expect(db).to.equal('customers');
            expect(props).to.deep.equal({
                name: 'Ilkka'
            });

            return { val: 1, err: false };
        };

        const customerObj = await Customer.create({ name: 'Ilkka' });

        expect(customerObj).to.deep.equal({
            collection: 'customers',
            _props: { name: 'Ilkka' },
            errors: {},
            id: 1
        });
    });

    it('create() fails, index error, no descriptions', async () => {
        rigiddbStub.prototype.create = function create(db, props) {
            expect(db).to.equal('customers');
            expect(props).to.deep.equal({
                name: 'Ilkka'
            });

            return { err: 'notUnique', val: false, indices: [ 'first', 'third' ] };
        };

        const customerObj = await Customer.create({ name: 'Ilkka' });

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

    it('create() fails, index error, descriptions are set', async () => {
        Customer = class extends Model {
            get config() {
                return {
                    indexErrorDescriptions: {
                        first: 'This is already reserved.',
                        third: 'This is already used.'
                    }
                };
            }
        };

        rigiddbStub.prototype.create = function create() {
            return { err: 'notUnique', val: false, indices: [ 'first', 'third' ] };
        };

        const customerObj = await Customer.create({
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

    it('set() succeeds', async () => {
        rigiddbStub.prototype.create = function create() {
            return { val: 1, err: false };
        };

        rigiddbStub.prototype.update = function update(db, id, props) {
            expect(db).to.equal('customers');
            expect(id).to.equal(1);
            expect(props).to.deep.equal({
                name: 'Tyrion'
            });

            return { val: true, err: false };
        };

        const customerObj = await Customer.create({ name: 'Ilkka' });
        const res = await customerObj.set({ name: 'Tyrion' });

        expect(res).to.deep.equal({ name: 'Tyrion' });

        expect(customerObj).to.deep.equal({
            collection: 'customers',
            _props: { name: 'Tyrion' },
            errors: {},
            id: 1
        });
    });

    it('set() fails, index error, no descriptions', async () => {
        rigiddbStub.prototype.create = function create() {
            return { val: 1, err: false };
        };

        rigiddbStub.prototype.update = function update() {
            return { val: false, err: 'notUnique', indices: [ 'name' ] };
        };

        const customerObj = await Customer.create({ name: 'Ilkka' });
        await customerObj.set({ name: 'Tyrion' });

        expect(customerObj).to.deep.equal({
            collection: 'customers',
            _props: { name: 'Ilkka' },
            errors: {
                name: 'Bad index.'
            },
            id: 1
        });
    });

    it('setProperty() fails, forbidden property', async () => {
        Customer = class extends Model {
            get config() {
                return {
                    allowedProps: [ 'age' ]
                };
            }
        };

        rigiddbStub.prototype.create = function create() {
            return { val: 1, err: false };
        };

        rigiddbStub.prototype.update = function update() {
            return { val: false, err: 'notUnique', indices: [ 'name' ] };
        };

        const customerObj = await Customer.create({ name: 'Ilkka' });
        const callback = sinon.spy();

        try {
            await customerObj.setProperty({ name: 'Tyrion' });
        } catch (e) {
            expect(e.message).to.equal('Tried to set invalid user model property name');
            callback();
        }

        expect(callback).to.have.been.called();
    });

    it('findFirst() succeeds', async () => {
        rigiddbStub.prototype.find = function find(db, props) {
            expect(db).to.equal('customers');
            expect(props).to.deep.equal({ name: 'Ilkka' });

            return { val: [ 42 ], err: false };
        };

        rigiddbStub.prototype.get = function get(db, id) {
            expect(db).to.equal('customers');
            expect(id).equal(42);

            return { val: { name: 'Ilkka', age: 36 }, err: false };
        };

        const customerObj = await Customer.findFirst({ name: 'Ilkka' });

        expect(customerObj).to.deep.equal({
            collection: 'customers',
            _props: { name: 'Ilkka', age: 36 },
            errors: {},
            id: 42
        });
    });


    it('find() succeeds', async () => {
        rigiddbStub.prototype.find = function find(db, props) {
            expect(db).to.equal('customers');
            expect(props).to.deep.equal({ name: 'Ilkka' });

            return { val: [ 42, 43 ], err: false };
        };

        let expectedId = 42;
        let age = 34;

        rigiddbStub.prototype.get = function get(db, id) {
            expect(db).to.equal('customers');
            expect(id).equal(expectedId++);

            return { val: { name: 'Ilkka', age: age++ }, err: false };
        };

        const customerObjs = await Customer.find({ name: 'Ilkka' });

        expect(customerObjs).to.deep.equal([ {
            collection: 'customers',
            _props: { name: 'Ilkka', age: 34 },
            errors: {},
            id: 42
        }, {
            collection: 'customers',
            _props: { name: 'Ilkka', age: 35 },
            errors: {},
            id: 43
        } ]);
    });
});
