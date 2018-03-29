/* jshint expr:true */

import EmberObject from '@ember/object';
import { expect } from 'chai';
import { beforeEach, describe, it } from 'mocha';
import indexArray from 'mas/utils/index-array';
import Message from 'mas/legacy-models/message';

describe('indexArray', function() {
    beforeEach(function() {
        this.obj = indexArray.create({ index: 'ssn', factory: Message });
    });

    it('object can be created', function() {
        expect(this.obj).to.be.ok;
    });

    it('behaves as an array', function() {
        this.obj.pushObjects(['a', 'b']);

        expect(this.obj.get('length')).to.equal(2);
        expect(this.obj.popObject()).to.equal('b');
    });

    it('has correct index', function() {
        expect(this.obj.get('index')).to.equal('ssn');
    });

    it('requires that index is set', function() {
        let model = EmberObject.create({ name: 'Ilkka' });

        expect(this.obj.upsertModels.bind(this.obj, [ model ]))
          .to.throw('Assertion Failed: Primary key \'ssn\' must exist');
    });

    it('search by index', function() {
        this.obj.upsertModels([ { name: 'Ilkka', ssn: 42 } ]);

        expect(this.obj.getByIndex(42).name).to.equal('Ilkka');
    });

    it('insert', function() {
        this.obj.upsertModels([ { name: 'Ilkka', ssn: 42 } ]);

        this.obj.upsertModel({ name: 'John', ssn: 43 });

        expect(this.obj.getByIndex(42).name).to.equal('Ilkka');
        expect(this.obj.getByIndex(43).name).to.equal('John');
        expect(this.obj.get('length')).to.equal(2);
    });

    it('upsert', function() {
        this.obj.upsertModels([
           { name: 'Ilkka', ssn: 42 },
           { name: 'John', ssn: 42 }
        ]);

        expect(this.obj.getByIndex(42).name).to.equal('John');
        expect(this.obj.get('length')).to.equal(1);
    });

    it('remove', function() {
        let first = this.obj.upsertModels([ { name: 'Ilkka', ssn: 42 } ]);
        let second = this.obj.upsertModels([ { name: 'John', ssn: 43 } ]);

        this.obj.removeModels([ first, second ]);
        expect(this.obj.get('length')).to.equal(0);
    });

    it('remove non-existent', function() {
        let first = this.obj.upsertModels([ { name: 'Ilkka', ssn: 42 } ]);
        this.obj.upsertModels([ { name: 'Ilkka', ssn: 43 } ]);

        this.obj.removeModels([ first, first ]);
        expect(this.obj.get('length')).to.equal(1);
    });

    it('clear', function() {
        this.obj.upsertModels([ { name: 'Ilkka', ssn: 42 } ]);

        this.obj.clearModels();
        expect(this.obj.get('length')).to.equal(0);
    });
});
