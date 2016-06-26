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

const assert = require('assert'),
      rigiddb = require('rigiddb');

const db = new rigiddb('mas', { db: 10 });

module.exports = class Model {
    constructor(collection, id = null, initialProps = {}) {
        if (typeof(id) !== 'number' && id !== null) {
            throw new Error(`ID must be a number or null.`);
        }

        if (collection === 'models') {
            throw new Error('An abstract Model class cannot be instantiated.');
        }

        this.collection = collection;
        this.id = id;
        this.errors = {};

        this._props = initialProps;
    }

    get config() {
        // Default configuration. Can be overwritten in derived classes.
        return {
            validator: false,
            allowedProps: false,
            indexErrorDescriptions: {}
        };
    }

    static get collection() {
        return `${this.name[0].toLowerCase()}${this.name.substring(1)}s`;
    }

    get valid() {
        assert(!this.deleted);
        return Object.keys(this.errors).length === 0;
    }

    static async fetch(id) {
        let record = new this(this.collection, id);

        const { error, val } = await db.get(record.collection, id);

        if (error) {
            return null;
        }

        record._props = val;
        return record;
    }

    static async fetchMany(ids) {
        let res = [];

        for (const id of ids) {
            res.push(await db.get(this.collection, id));
        }

        return res.filter(({ err }) => !err).map(({ val }, index) =>
            new this(this.collection, ids[index], val));
    }

    static async findIds(props) {
        if (!props || Object.keys(props) === 0) {
            return null;
        }

        const { err, val } = await db.find(this.collection, props);

        assert(!err);

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

    static async create(props) {
        let record = new this(this.collection);

        if (record.config.validator) {
            const { errors } = record.config.validator.validate(props);
            record.errors = errors || {};
        }

        if (record.valid) {
            const { err, val, indices } = await db.create(record.collection, props);

            if (err === 'notUnique') {
                record.errors = explainIndexErrors(indices, record.config.indexErrorDescriptions);
            } else if (err) {
                throw new Error(`DB ERROR: ${err}`);
            } else {
                record.id = val || null;
                record._props = props;
            }
        }

        return record;
    }

    static async currentId() {
        const { err, val } = await db.currentId(this.collection);

        assert (!err);

        return val;
    }

    get(prop) {
        assert(!this.deleted);

        return this._props[prop];
    }

    getAll() {
        assert(!this.deleted);

        return Object.assign({}, this._props);
    }

    async set(props, value) {
        assert(!this.deleted);

        props = convertToObject(props, value);

        if (this.validator) {
            const { valid, errors } = this.config.validator.validate(props);

            if (!valid) {
                this.errors = errors;
                return props;
            }
        }

        const { err, indices, val } = await db.update(this.collection, this.id, props);

        if (err === 'notUnique') {
            this.errors = explainIndexErrors(indices, this.config.indexErrorDescriptions);
        } else if (err) {
            throw new Error(`DB ERROR: ${err}`);
        } else {
            this.errors = {};
            Object.assign(this._props, props);
        }

        return val;
    }

    async setProperty(props, value) {
        assert(!this.deleted);

        props = convertToObject(props, value);

        for (const prop of Object.keys(props)) {
            if (this.config.allowedProps && !this.config.allowedProps.includes(prop)) {
                throw new Error(`Tried to set invalid user model property ${prop}`);
            }
        }

        return await this.set(props);
    }

    async delete() {
        assert(!this.deleted);

        const { val } = await db.delete(this.collection, this.id);
        this.deleted = true;

        return val;
    }
};

function convertToObject(props, value) {
    if (!props) {
        return false;
    } else if (typeof(props) === 'string') {
        props = { [props]: value };
    }

    return props;
}

function explainIndexErrors(indices, descriptions = {}) {
    let errors = {};

    indices.forEach(index => errors[index] = descriptions[index] || `Bad index.`)

    return errors;
}
