//
//   Copyright 2014 Ilkka Oksanen <iao@iki.fi>
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

const User = require('../models/user');
const authSessionService = require('../services/authSession');

exports.auth = function *auth(next) {
    this.mas = this.mas || {};
    this.mas.user = null;

    const cookieValue = this.cookies.get('mas');

    if (cookieValue) {
        const userId = yield authSessionService.validate(cookieValue);
        const user = userId ? yield User.fetch(userId) : null;

        if (!user || !user.get('inUse')) {
            this.cookies.set('mas'); // Delete the potentially invalid cookie
            this.response.redirect('/');
            return;
        }

        this.mas.user = user;
    }

    yield next;
};
