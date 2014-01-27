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

var forms = require('forms'),
    fields = forms.fields,
    widgets = forms.widgets,
    validators = forms.validators,
    Q = require('q');

var registrationForm = forms.create({
    name: fields.string({
        required: true,
        label: 'Your name',
        errorAfterField: true,
        widget: widgets.text({
            classes: ['form-control'],
            placeholder: 'First Last',
        }),
        cssClasses: {
            label: ['control-label']
        },
        validators: [validators.minlength(6)]
    }),
    email: fields.email({
        required: true,
        label: 'Email address',
        errorAfterField: true,
        widget: widgets.text({
            classes: ['form-control'],
            placeholder: 'me@example.com',
        }),
        cssClasses: {
            label: ['control-label']
        },
        validators: [validators.email()]
    }),
    password: fields.password({
        required: true,
        label: 'Password',
        errorAfterField: true,
        widget: widgets.password({
            classes: ['form-control']
        }),
        cssClasses: {
            label: ['control-label']
        },
        validators: [validators.minlength(6)]
    }),
    confirm: fields.password({
        required: true,
        label: 'Password (again)',
        errorAfterField: true,
        widget: widgets.password({
            classes: ['form-control']
        }),
        cssClasses: {
            label: ['control-label']
        },
        validators: [validators.matchField('password')]
    }),
    nick: fields.string({
        required: true,
        label: 'Nickname',
        errorAfterField: true,
        widget: widgets.text({
            classes: ['form-control'],
            placeholder: 'Nick',
        }),
        cssClasses: {
            label: ['control-label']
        },
        // TBD Validate uniqueness and rules
    }),
    tos: fields.boolean({
        required: true,
        label: 'TOS',
        widget: widgets.checkbox({
            placeholder: 'foo'
        })
    })
});

function decodeForm(req) {
    var deferred = Q.defer();

    registrationForm.handle(req, {
        success: function (form) {
            deferred.resolve(form);
        },
        error: function (form) {
            w.info('Registration form data is invalid');
            deferred.resolve(form);
        },
        empty: function (form) {
            w.info('There is no form');
            deferred.resolve(form);
        }
    });

    return deferred.promise;
}

module.exports = {
    // GET /register
    index: function *() {
        var form = yield decodeForm(this.req);

        yield this.render('register', {
            page: 'register',
            title: 'Register',
            registrationForm: form.toHTML()
        });
    },

    // POST /register
    create: function *() {
        var form = yield decodeForm(this.req);

        if (form.isValid()) {
            w.info('Registration form data is valid');
            // TBD: Save to redis.
            // user = new User({
            //     name: form.data.name,
            //     email: form.data.email,
            //     password: form.data.password,
            //     nick: form.data.nick
            // });
            // user.save();
            this.response.redirect('/registration-success.html');
        } else {
            yield this.render('register', {
                page: 'register',
                title: 'MeetAndSpeak',
                registrationForm: form.toHTML()
            });
        }
    }
};
