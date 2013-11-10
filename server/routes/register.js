//
//   Copyright 2009-2013 Ilkka Oksanen <iao@iki.fi>
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

var mysql = require('mysql'),
    crypto = require('crypto');

var nconf = require('nconf').file('config.json');

var forms = require('forms'),
    fields = forms.fields,
    widgets = forms.widgets,
    validators = forms.validators;

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
        validators: [validators.email]
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

function renderPage(res, form) {
    res.render('register', {
        page: 'register',
        title: 'MeetAndSpeak',
        helpers: {
            registrationForm: function() {
                w.info('calling toHTML');
               return form.toHTML();
            }
        }
    });
}

module.exports = function(req, res) {
    var body = req.body;

    w.info('ilkka1');

    registrationForm.handle(req, {
        success: function (form) {
            // there is a request and the form is valid
            // form.data contains the submitted data
            w.info('Registration OK');
        },
        error: function (form) {
            // the data in the request didn't validate,
            // calling form.toHTML() again will render the error messages
            w.info('Registration FAIL');
            renderPage(res, form);
        },
        empty: function (form) {
            // there was no form data in the request
            w.info('There is no form');
            renderPage(res, form);
        }
    });
};

function saveUser() {
    // Checks done, all is good

    var password = req.body.password;
    var passwordSha =
            crypto.createHash('sha256').update(password, 'utf8').digest('hex');

    var connection = mysql.createConnection({
        host: 'localhost',
        user: nconf.get('dbUsername'),
        password: nconf.get('dbPassword'),
        database: 'milhouse'
    });

    connection.query(
        'INSERT INTO users VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', [
        body.name,
        '-',
        body.email,
        1,
        null,
        passwordSha,
        body.nick,
        1, //gender
        'TDB:token',
        '',
        0,
        ':',
        ':',
        'NA',
        1, //hasinvite
        '',
        'TBD:ip',
        1,
        1,
        4,
        ''],
        function(err, rows) {
            if (err) {
                console.log(err);
                console.log('Rows: ' + rows);
                res.json({
                    success: false,
                    msg: 'Database error. Please contact support.'
                });
            } else {
                res.json({
                    success: true
                });
            }
        });
}