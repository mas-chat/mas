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

const forms = require('forms'),
      fields = forms.fields,
      widgets = forms.widgets,
      validators = forms.validators,
      Q = require('q'),
      httpStatus = require('statuses'),
      redis = require('../lib/redis').createClient(),
      log = require('../lib/log'),
      cookie = require('../lib/cookie'),
      User = require('../models/user');

let formFields = {
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
        },
        validators: [ validators.minlength(6) ]
    }),
    email: fields.email({
        required: true,
        label: 'Email address',
        errorAfterField: true,
        widget: widgets.text({
            classes: [ 'form-control' ],
            placeholder: 'me@example.com'
        }),
        cssClasses: {
            label: [ 'control-label' ]
        },
        validators: [ validators.email() ]
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
        },
        validators: [ validators.minlength(6) ]
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
        },
        validators: [ validators.rangelength(3, 14, 'Nick has to be 3-14 characters long.'),
            validateNick ]
    }),
    tos: fields.boolean({
        required: validators.required('You must agree MAS TOS'),
        label: 'I agree MAS Terms of Service',
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

function validateNick(form, field, callback) {
    let nick = field.data;

    if (/[0-9]/.test(nick.charAt(0))) {
        callback('Nick can\'t start with digit');
    } else if (!(/^[A-Z\`a-z0-9[\]\\_\^{|}]+$/.test(nick))) {
        let valid = [ 'a-z', '0-9', '[', ']', '\\', '`', '_', '^', '{', '|', '}' ];
        valid = '<span class="badge">' + valid.join('</span> <span class="badge">') + '</span>';

        callback('Illegal characters, allowed are ' + valid);
    } else {
        callback();
    }
}

let registrationForm = forms.create({
    name: formFields.name,
    email: formFields.email,
    password: formFields.password,
    confirm: formFields.confirm,
    nick: formFields.nick,
    tos: formFields.tos
});

let registrationFormExt = forms.create({
    name: formFields.name,
    email: formFields.email,
    nick: formFields.nick,
    tos: formFields.tos,
    registrationType: formFields.registrationType
});

let registrationFormReset = forms.create({
    password: formFields.password,
    confirm: formFields.confirm,
    token: formFields.token
});

function decodeForm(req, inputForm) {
    let deferred = Q.defer();

    inputForm.handle(req, {
        success: function(form) {
            deferred.resolve(form);
        },
        error: function(form) {
            log.info('Registration form data is invalid');
            deferred.resolve(form);
        },
        empty: function(form) {
            log.info('There is no form');
            deferred.resolve(form);
        }
    });

    return deferred.promise;
}

function *nickOrEmailTaken(nickOrEmail, field, type) {
    let userId = yield redis.hget('index:user', nickOrEmail.toLowerCase());

    if (userId) {
        field.error = 'This ' + type + ' is already reserved.';
        return true;
    } else {
        return false;
    }
}

exports.index = function*() {
    let extAuth = this.query.ext === 'true';
    let form, template;

    if (extAuth) {
        if (!this.mas.userId) {
            this.status = httpStatus('bad request');
            return;
        }

        template = 'register-ext';

        let user = yield redis.hgetall(`user:${this.mas.userId}`);
        form = registrationFormExt.bind({
            name: user.name,
            email: user.email,
            registrationType: 'ext'
        });
    } else {
        template = 'register';
        form = registrationForm;
    }

    yield this.render(template, {
        page: 'register',
        title: 'Register',
        registrationForm: form.toHTML()
    });
};

exports.indexReset = function*() {
    let token = this.params.token;
    let userId = yield redis.get(`passwordresettoken:${token}`);

    if (!userId) {
        this.body = 'Expired or invalid password reset link.';
        return;
    }

    let form = registrationFormReset.bind({ token: token });

    yield this.render('register-reset', {
        page: 'register',
        title: 'Register',
        registrationForm: form.toHTML()
    });
};

exports.create = function*() {
    let form = yield decodeForm(this.req, registrationForm);
    let emailInUse = yield nickOrEmailTaken(form.data.email, form.fields.email, 'email address');
    let nickInUse = yield nickOrEmailTaken(form.data.nick, form.fields.nick, 'nick');

    if (!form.isValid() || emailInUse || nickInUse) {
        yield this.render('register', {
            page: 'register',
            title: 'Register',
            registrationForm: form.toHTML()
        });
    } else {
        log.info('Registration form data is valid');

        let user = new User({
            name: form.data.name,
            email: form.data.email,
            nick: form.data.nick,
            inuse: 'true',
            registrationtime: Math.round(Date.now() / 1000)
        }, {}, {});

        user.setPassword(form.data.password);
        let userId = yield user.generateUserId();
        yield user.save();

        let resp = yield cookie.createSession(userId);
        cookie.set(userId, resp.secret, resp.expires, this);
        this.response.redirect('/app');
    }
};

exports.createExt = function*() {
    let form = yield decodeForm(this.req, registrationFormExt);
    let nickInUse = yield nickOrEmailTaken(form.data.nick, form.fields.nick, 'nick');

    if (!this.mas.userId) {
        this.status = httpStatus('bad request');
        return;
    }

    let user = new User();
    yield user.load(this.mas.userId);

    let emailInUse = false;

    if (form.data.email && form.data.email.toLowerCase() === user.data.email.toLowerCase()) {
        // Keep using the email address from external authenticator
        emailInUse = false;
    } else {
        emailInUse = yield nickOrEmailTaken(form.data.email, form.fields.email, 'email address');
    }

    if (!form.isValid() || (emailInUse && this.mas.email !== form.data.email) || nickInUse) {
        yield this.render('register-ext', {
            page: 'register',
            title: 'Register',
            registrationForm: form.toHTML()
        });
    } else {
        // TBD: User object doesn't support changing email address yet, hence the hack
        yield redis.hdel('index:user', user.data.email);

        user.data.name = form.data.name;
        user.data.email = form.data.email;
        user.data.nick = form.data.nick;
        user.data.inuse = 'true';
        user.data.registrationtime = Math.round(Date.now() / 1000);
        yield user.save();

        this.response.redirect('/app');
    }
};

exports.createReset = function*() {
    let form = yield decodeForm(this.req, registrationFormReset);

    let userId = yield redis.get(`passwordresettoken:${form.data.token}`);

    if (!userId) {
        this.status = httpStatus('bad request');
        return;
    }

    if (!form.isValid()) {
        yield this.render('register-reset', {
            page: 'register',
            title: 'Register',
            registrationForm: form.toHTML()
        });
    } else {
        yield redis.del(`passwordresettoken:${form.data.token}`);

        let user = new User();
        yield user.load(userId);
        user.setPassword(form.data.password);
        yield user.save();

        this.response.redirect('/');
    }
};
