//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
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

const forms = require('forms');
const httpStatus = require('statuses');
const redis = require('../lib/redis').createClient();
const authOptions = require('../lib/authOptions');
const User = require('../models/user');
const usersService = require('../services/users');
const authSessionService = require('../services/authSession');

const fields = forms.fields;
const widgets = forms.widgets;
const validators = forms.validators;

const formFields = {
    name: fields.string({
        required: true,
        label: 'Your name',
        errorAfterField: true,
        widget: widgets.text({
            classes: [ 'form-control' ],
            placeholder: 'First Last'
        }),
        cssClasses: {
            label: [ 'control-label' ]
        }
    }),
    email: fields.string({
        required: true,
        label: 'Email address',
        errorAfterField: true,
        widget: widgets.text({
            classes: [ 'form-control' ],
            placeholder: 'me@example.com'
        }),
        cssClasses: {
            label: [ 'control-label' ]
        }
    }),
    password: fields.password({
        required: true,
        label: 'Password',
        errorAfterField: true,
        widget: widgets.password({
            classes: [ 'form-control' ]
        }),
        cssClasses: {
            label: [ 'control-label' ]
        }
    }),
    confirm: fields.password({
        required: true,
        label: 'Password (again)',
        errorAfterField: true,
        widget: widgets.password({
            classes: [ 'form-control' ]
        }),
        cssClasses: {
            label: [ 'control-label' ]
        },
        validators: [ validators.matchField('password') ]
    }),
    nick: fields.string({
        required: true,
        label: 'Nickname',
        errorAfterField: true,
        widget: widgets.text({
            classes: [ 'form-control' ],
            placeholder: 'Nick'
        }),
        cssClasses: {
            label: [ 'control-label' ]
        }
    }),
    tos: fields.boolean({
        required: validators.required('You must agree MAS TOS'),
        label: 'I agree <a target="_blank" href="/tos">MAS Terms of Service</a>',
        errorAfterField: true,
        widget: widgets.checkbox({
            placeholder: 'foo'
        })
    }),
    registrationType: fields.string({
        required: false,
        widget: widgets.hidden()
    }),
    token: fields.string({
        required: false,
        widget: widgets.hidden()
    })
};

const registrationFormExt = forms.create({
    name: formFields.name,
    email: formFields.email,
    nick: formFields.nick,
    tos: formFields.tos,
    registrationType: formFields.registrationType
});

const registrationFormReset = forms.create({
    password: formFields.password,
    confirm: formFields.confirm,
    token: formFields.token
});

function decodeForm(req, inputForm) {
    return new Promise(resolve => inputForm.handle(req, {
        success: resolve,
        error: resolve,
        empty: resolve
    }));
}

const ONE_WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

exports.index = function *index() {
    if (this.query.ext !== 'true') {
        return;
    }

    const newUser = this.mas.user;

    if (!newUser) {
        this.status = httpStatus('bad request');
        return;
    }

    const form = registrationFormExt.bind({
        name: newUser.get('name'),
        email: newUser.get('email'),
        registrationType: 'ext'
    });

    yield this.render('register-ext', {
        page: 'register',
        title: 'Register',
        registrationForm: form.toHTML(),
        auth: authOptions
    });
};

exports.indexReset = function *indexReset() {
    const token = this.params.token;
    const userId = yield redis.get(`passwordresettoken:${token}`);

    if (!userId) {
        this.body = 'Expired or invalid password reset link.';
        return;
    }

    const form = registrationFormReset.bind({ token });

    yield this.render('register-reset', {
        page: 'register',
        title: 'Register',
        registrationForm: form.toHTML()
    });
};

exports.create = function *create() {
    const details = this.request.body;
    const newUser = yield usersService.addUser(details);

    if (newUser.valid) {
        yield newUser.set('inUse', true);
        yield usersService.addMASNetworkInfo(newUser);

        const cookie = authSessionService.encodeToCookie(
            yield authSessionService.create(newUser.id, this.request.ip));

        this.cookies.set('mas', cookie, { maxAge: ONE_WEEK_IN_MS, httpOnly: false });

        this.body = { success: true };
    } else {
        this.body = { success: false, errors: newUser.errors };
    }
};

exports.createExt = function *createExt() {
    const form = yield decodeForm(this.req, registrationFormExt);

    function *renderForm(ctx) {
        yield ctx.render('register-ext', {
            page: 'register',
            title: 'Register',
            registrationForm: form.toHTML()
        });
    }

    const user = this.mas.user;

    if (!user) {
        this.status = httpStatus('bad request');
        return;
    }

    if (user.get('email') === form.data.email) {
        // If the user didn't change his email address, we trust what Google/Yahoo gave us.
        yield user.set('emailConfirmed', true);
    } else {
        yield user.updateEmail(form.data.email);
    }

    if (user.valid) {
        yield user.set('nick', form.data.nick);
        yield usersService.addMASNetworkInfo(user);
    }

    if (!form.isValid()) {
        yield renderForm(this);
        return;
    } else if (!user.valid) {
        Object.keys(user.errors).forEach(field => {
            form.fields[field].error = user.errors[field];
        });

        yield renderForm(this);
        return;
    }

    user.set('inUse', true);

    const cookie = authSessionService.encodeToCookie(
        yield authSessionService.create(user.id, this.request.ip));

    this.cookies.set('mas', cookie, { maxAge: ONE_WEEK_IN_MS, httpOnly: false });

    this.response.redirect('/app');
};

exports.createReset = function *createReset() {
    const form = yield decodeForm(this.req, registrationFormReset);

    const userId = yield redis.get(`passwordresettoken:${form.data.token}`);

    function *renderForm(ctx) {
        yield ctx.render('register-reset', {
            page: 'register',
            title: 'Register',
            registrationForm: form.toHTML()
        });
    }

    if (!userId) {
        this.status = httpStatus('bad request');
        return;
    }

    if (!form.isValid()) {
        yield renderForm(this);
        return;
    }

  //  yield redis.del(`passwordresettoken:${form.data.token}`);

    const userRecord = yield User.fetch(parseInt(userId));

    if (!userRecord) {
        this.status = httpStatus('bad request');
        return;
    }

    yield userRecord.changePassword(form.data.password);

    if (!userRecord.valid) {
        Object.keys(userRecord.errors).forEach(field => {
            form.fields[field].error = userRecord.errors[field];
        });

        yield renderForm(this);
        return;
    }

    this.response.redirect('/');
};
