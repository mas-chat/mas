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
import redis from '../lib/redis';
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
      classes: ['form-control'],
      placeholder: 'First Last'
    }),
    cssClasses: {
      label: ['control-label']
    }
  }),
  email: fields.string({
    required: true,
    label: 'Email address',
    errorAfterField: true,
    widget: widgets.text({
      classes: ['form-control'],
      placeholder: 'me@example.com'
    }),
    cssClasses: {
      label: ['control-label']
    }
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
    }
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
      placeholder: 'Nick'
    }),
    cssClasses: {
      label: ['control-label']
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
  return new Promise(resolve =>
    inputForm.handle(req, {
      success: resolve,
      error: resolve,
      empty: resolve
    })
  );
}

const ONE_WEEK_IN_MS = 1000 * 60 * 60 * 24 * 7;

exports.index = async function index(ctx) {
  if (ctx.query.ext !== 'true') {
    return;
  }

  const newUser = ctx.mas.user;

  if (!newUser) {
    ctx.status = httpStatus('bad request');
    return;
  }

  const form = registrationFormExt.bind({
    name: newUser.get('name'),
    email: newUser.get('email'),
    registrationType: 'ext'
  });

  await ctx.render('register-ext', {
    page: 'register',
    title: 'Register',
    registrationForm: form.toHTML(),
    auth: authOptions
  });
};

exports.indexReset = async function indexReset(ctx) {
  const token = ctx.params.token;
  const userId = await redis.get(`frontend:password_reset_token:${token}`);

  if (!userId) {
    ctx.body = 'Expired or invalid password reset link.';
    return;
  }

  const form = registrationFormReset.bind({ token });

  await ctx.render('register-reset', {
    page: 'register',
    title: 'Register',
    registrationForm: form.toHTML()
  });
};

exports.create = async function create(ctx) {
  const details = ctx.request.body;
  const newUser = await usersService.addUser(details);

  if (newUser.valid) {
    await newUser.set('inUse', true);
    await usersService.addMASNetworkInfo(newUser);

    const session = await authSessionService.create(newUser.id, ctx.request.ip);

    ctx.cookies.set('mas', session.encodeToCookie(), {
      maxAge: ONE_WEEK_IN_MS,
      httpOnly: false
    });

    ctx.body = { success: true };
  } else {
    ctx.body = { success: false, errors: newUser.errors };
  }
};

exports.createExt = async function createExt(ctx) {
  const form = await decodeForm(ctx.req, registrationFormExt);

  async function renderForm() {
    await ctx.render('register-ext', {
      page: 'register',
      title: 'Register',
      registrationForm: form.toHTML()
    });
  }

  const user = ctx.mas.user;

  if (!user) {
    ctx.status = httpStatus('bad request');
    return;
  }

  if (user.get('email') === form.data.email) {
    // If the user didn't change his email address, we trust what Google/Yahoo gave us.
    await user.set('emailConfirmed', true);
  } else {
    await user.updateEmail(form.data.email);
  }

  if (user.valid) {
    await user.set('nick', form.data.nick);
    await usersService.addMASNetworkInfo(user);
  }

  if (!form.isValid()) {
    await renderForm();
    return;
  } else if (!user.valid) {
    Object.keys(user.errors).forEach(field => {
      form.fields[field].error = user.errors[field];
    });

    await renderForm();
    return;
  }

  user.set('inUse', true);

  const cookie = authSessionService.encodeToCookie(await authSessionService.create(user.id, ctx.request.ip));

  ctx.cookies.set('mas', cookie, { maxAge: ONE_WEEK_IN_MS, httpOnly: false });

  ctx.response.redirect('/app');
};

exports.createReset = async function createReset(ctx) {
  const form = await decodeForm(ctx.req, registrationFormReset);
  const userId = await redis.get(`frontend:password_reset_token:${form.data.token}`);

  async function renderForm() {
    await ctx.render('register-reset', {
      page: 'register',
      title: 'Register',
      registrationForm: form.toHTML()
    });
  }

  if (!userId) {
    ctx.status = httpStatus('bad request');
    return;
  }

  if (!form.isValid()) {
    await renderForm();
    return;
  }

  await redis.del(`frontend:password_reset_token:${form.data.token}`);

  const userRecord = await User.fetch(parseInt(userId));

  if (!userRecord) {
    ctx.status = httpStatus('bad request');
    return;
  }

  await userRecord.changePassword(form.data.password);

  if (!userRecord.valid) {
    Object.keys(userRecord.errors).forEach(field => {
      form.fields[field].error = userRecord.errors[field];
    });

    await renderForm();
    return;
  }

  ctx.response.redirect('/');
};
