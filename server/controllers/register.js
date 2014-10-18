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

var forms = require('forms'),
    fields = forms.fields,
    widgets = forms.widgets,
    validators = forms.validators,
    Q = require('q'),
    httpStatus = require('statuses'),
    redis = require('../lib/redis').createClient(),
    log = require('../lib/log'),
    cookie = require('../lib/cookie'),
    User = require('../models/user');

var formFields = {
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
        validators: [ validators.rangelength(3, 14, 'Nick has to 3-14 characters long.'),
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
    var nick = field.data;

    if (/[0-9]/.test(nick.charAt(0))) {
        callback('Nick can\'t start with digit');
    } else if (!(/^[A-Z\`a-z0-9[\]\\_\^{|}]+$/.test(nick))) {
        var valid = [ 'a-z', '0-9', '[', ']', '\\', '`', '_', '^', '{', '|', '}' ];
        valid = '<span class="badge">' + valid.join('</span> <span class="badge">') + '</span>';

        callback('Illegal characters, allowed are ' + valid);
    } else {
        callback();
    }
}

var registrationForm = forms.create({
    name: formFields.name,
    email: formFields.email,
    password: formFields.password,
    confirm: formFields.confirm,
    nick: formFields.nick,
    tos: formFields.tos
});

var registrationFormExt = forms.create({
    name: formFields.name,
    email: formFields.email,
    nick: formFields.nick,
    tos: formFields.tos,
    registrationType: formFields.registrationType
});

var registrationFormReset = forms.create({
    password: formFields.password,
    confirm: formFields.confirm,
    token: formFields.token
});

function decodeForm(req, inputForm) {
    var deferred = Q.defer();

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
    var userId = yield redis.hget('index:user', nickOrEmail.toLowerCase());

    if (userId) {
        field.error = 'This ' + type + ' is already reserved.';
        return true;
    } else {
        return false;
    }
}

exports.index = function*() {
    var extAuth = this.query.ext === 'true';
    var form, template;

    if (extAuth) {
        if (!this.mas.userId) {
            this.status = httpStatus('bad request');
            return;
        }

        template = 'register-ext';

        var user = yield redis.hgetall('user:' + this.mas.userId);
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
    var token = this.params.token;
    var userId = yield redis.get('passwordresettoken:' + token);

    if (!userId) {
        this.body = 'Expired or invalid password reset link.';
        return;
    }

    var form = registrationFormReset.bind({ token: token });

    yield this.render('register-reset', {
        page: 'register',
        title: 'Register',
        registrationForm: form.toHTML()
    });
};

exports.create = function*() {
    var form = yield decodeForm(this.req, registrationForm);
    var emailInUse = yield nickOrEmailTaken(form.data.email, form.fields.email, 'email address');
    var nickInUse = yield nickOrEmailTaken(form.data.nick, form.fields.nick, 'nick');

    if (!form.isValid() || emailInUse || nickInUse) {
        yield this.render('register', {
            page: 'register',
            title: 'Register',
            registrationForm: form.toHTML()
        });
    } else {
        log.info('Registration form data is valid');

        var user = new User({
            name: form.data.name,
            email: form.data.email,
            nick: form.data.nick,
            inuse: '1'
        }, {}, {});

        user.setFinalPasswordSha(form.data.password);
        var userId = yield user.generateUserId();
        yield user.save();

        var resp = yield cookie.createSession(userId);
        cookie.set(userId, resp.secret, resp.expires, this);
        this.response.redirect('/app');
    }
};

exports.createExt = function*() {
    var form = yield decodeForm(this.req, registrationFormExt);
    var emailInUse = yield nickOrEmailTaken(form.data.email, form.fields.email, 'email address');
    var nickInUse = yield nickOrEmailTaken(form.data.nick, form.fields.nick, 'nick');

    if (!this.mas.userId) {
        this.status = httpStatus('bad request');
        return;
    }

    if (!form.isValid() || (emailInUse && this.mas.email !== form.data.email) || nickInUse) {
        yield this.render('register-ext', {
            page: 'register',
            title: 'Register',
            registrationForm: form.toHTML()
        });
    } else {
        yield redis.hmset('user:' + this.mas.userId, {
            name: form.data.name,
            email: form.data.email,
            nick: form.data.nick,
            inuse: '1'
        });

        this.response.redirect('/app');
    }
};

exports.createReset = function*() {
    var form = yield decodeForm(this.req, registrationFormReset);

    var userId = yield redis.get('passwordresettoken:' + form.data.token);

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
        yield redis.del('passwordresettoken:' + form.data.token);

        var user = new User();
        yield user.load(userId);
        user.setFinalPasswordSha(form.data.password);
        yield user.save();

        this.response.redirect('/');
    }
};
