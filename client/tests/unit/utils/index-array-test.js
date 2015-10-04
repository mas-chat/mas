/* jshint expr:true */

import { expect } from 'chai';
import { describe, it } from 'mocha';
import indexArray from 'mas/utils/index-array';

describe('indexArray', function() {
    beforeEach(function() {
        this.obj = indexArray.create({ index: 'ssn' });
    });

    it('works', function() {
        expect(this.obj).to.be.ok;
    });

    it('behaves as an array', function() {
        this.obj.pushObjects(['a', 'b']);

        expect(this.obj.get('length')).to.equal(2);
        expect(this.obj.popObject()).to.equal('b');
    });

    it('has index set', function() {
        expect(this.obj.get('index')).to.equal('ssn');
    });

    it('foo', function() {
        let model = Ember.Object.create({ name: 'Ilkka' });

        expect(this.obj.insertModels.bind(this.obj, [ model ])).to.throw('Assertion Failed: Primary key must exist');
    });

    it('foo', function() {
        let model = Ember.Object.create({ name: 'Ilkka', ssn: 42 })

        this.obj.insertModels([ model ])
    });
});
