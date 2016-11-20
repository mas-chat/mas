//
//   Copyright 2014-2016 Ilkka Oksanen <iao@iki.fi>
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing,
//   software distributed under the License is distributed on an "AS
//   IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
//   express or implied.  See the License for the specific language
//   governing permissions and limitations under the License.
//

'use strict';

const assert = require('assert');
const Rigiddb = require('rigiddb');
const conf = require('../lib/conf');

const db = new Rigiddb('mas', 1, {
    db: 10,
    host: conf.get('redis:host'), // TODO: Add Unix socket support
    port: conf.get('redis:port')
});

module.exports = class Model {
    constructor(collection, id = null, initialProps = {}) {
        if (typeof id !== 'number' && id !== null) {
            throw new Error('ID must be a number or null.');
        }

        if (collection === 'models') {
            throw new Error('An abstract Model class cannot be instantiated.');
        }

        this.deleted = false;
        this.collection = collection;
        this.id = id;
        this.errors = {};

        this._props = initialProps;
    }

    static get mutableProperties() {
        return [];
    }

    static get getters() {
        return {};
    }

    static get setters() {
        return {};
    }

    static get config() {
        // Default configuration. Can be overwritten in derived classes.
        return {
            indexErrorDescriptions: {}
        };
    }

    static get collection() {
        return `${this.name[0].toLowerCase()}${this.name.substring(1)}s`;
    }

    get valid() {
        assert(!this.deleted, 'Tried to validate deleted model');
        return Object.keys(this.errors).length === 0;
    }

    static async fetch(id) {
        const record = new this(this.collection, id);
        const { err, val } = await db.get(record.collection, id);

        if (err) {
            return null;
        }

        record._props = val;
        return record;
    }

    static async fetchMany(ids) {
        const res = [];

        for (const id of ids) {
            res.push(await db.get(this.collection, id));
        }

        return res.filter(({ err }) => !err).map(({ val }, index) =>
            new this(this.collection, ids[index], val));
    }

    static async fetchAll() {
        const { err, val } = await db.list(this.collection);

        return err ? [] : await this.fetchMany(val);
    }

    static async findIds(props) {
        if (!props || Object.keys(props) === 0) {
            return null;
        }

        const { err, val } = await db.find(this.collection, props);

        assert(!err, `Model findIds failed: ${err}, ${JSON.stringify(props)}`);

        return val.sort((a, b) => a - b);
    }

    static async find(props, { onlyFirst = false } = {}) {
        const ids = await this.findIds(props);

        if (onlyFirst && ids.length === 0) {
            return null;
        }

        return await onlyFirst ? this.fetch(ids[0]) : this.fetchMany(ids);
    }

    static async findFirst(props) {
        return await this.find(props, { onlyFirst: true });
    }

    static async create(props, { skipSetters = false } = {}) {
        const record = new this(this.collection);
        let preparedProps = props;

        if (!skipSetters) {
            const { setProps, setErrors } = runSetters(props, this.setters);
            preparedProps = setProps;
            record.errors = setErrors;
        }

        if (record.valid) {
            const { err, val, indices } = await db.create(record.collection, preparedProps);

            if (err === 'notUnique') {
                record.errors = explainIndexErrors(indices, this.config.indexErrorDescriptions);
            } else if (err) {
                throw new Error(
                    `DB ERROR: ${err}, c: ${this.collection}, p: ${JSON.stringify(props)}`);
            } else {
                record.id = val || null;
                record._props = preparedProps;
            }
        }

        return record;
    }

    static async currentId() {
        const { err, val } = await db.currentId(this.collection);

        assert(!err, 'Failed to read currentId');

        return val;
    }

    get(prop) {
        assert(!this.deleted, `Tried to read property ${prop} from deleted model`);

        const rawVal = this._props[prop];

        return Model.getters[prop] ? Model.getters[prop](rawVal) : rawVal;
    }

    getAll() {
        assert(!this.deleted, 'Tried to read deleted model');

        const props = {};

        Object.keys(this._props).forEach(prop => {
            const rawVal = this._props[prop];
            props[prop] = Model.getters[prop] ? Model.getters[prop](rawVal) : rawVal;
        });

        return props;
    }

    async set(props, value) {
        const objectProps = convertToObject(props, value);

        const allowed = Object.keys(objectProps).every(prop =>
            this.constructor.mutableProperties.includes(prop));

        if (!allowed) {
            throw new Error('Tried to set non-existent or protected property');
        }

        return this._set(objectProps);
    }

    async _set(objectProps) {
        assert(!this.deleted, 'Tried to mutate deleted model');

        const { errors, preparedProps } = runSetters(objectProps, Model.setters);

        if (!preparedProps) {
            Object.keys(objectProps).forEach(prop => {
                if (errors[prop]) {
                    this.errors[prop] = errors[prop];
                } else {
                    delete this.errors[prop];
                }
            });

            return false; // One or more setters failed
        }

        const { err, indices, val } = await db.update(this.collection, this.id, preparedProps);

        if (err === 'notUnique') {
            this.errors = explainIndexErrors(
                indices, this.constructor.config.indexErrorDescriptions);
        } else if (err) {
            throw new Error(
                `DB ERROR: ${err}, c: ${this.collection}, p: ${JSON.stringify(objectProps)}`);
        } else {
            this.errors = {};
            Object.assign(this._props, objectProps);
        }

        return val;
    }

    async delete() {
        assert(!this.deleted, 'Tried to delete deleted model');

        const { val } = await db.delete(this.collection, this.id);
        this.deleted = true;

        return val;
    }
};

function runSetters(objectProps, setters) {
    const preparedProps = {};
    const errors = {};

    for (const prop of Object.keys(objectProps)) {
        const value = objectProps[prop];

        if (setters[prop]) {
            const { valid, value: rawValue, error } = setters[prop](value);

            if (!valid) {
                errors[prop] = error;
            }

            preparedProps[prop] = valid ? rawValue : null;
        } else {
            preparedProps[prop] = value;
        }
    }

    return { errors, preparedProps };
}

function convertToObject(props, value) {
    if (!props) {
        return {};
    }

    return typeof props === 'string' ? { [props]: value } : props;
}

function explainIndexErrors(indices, descriptions = {}) {
    const errors = {};

    indices.forEach(index => {
        errors[index] = descriptions[index] || 'INDEX ERROR: Value already exists.';
    });

    return errors;
}
