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

exports.createSession = async function createSession(user, ctx) {
    const ts = new Date();
    let secret = user.get('secret');
    let secretExpires = user.get('secretExpires');

    if (!secret || !secretExpires || ts > secretExpires) {
        ({ secret, secretExpires } = await user.generateNewSecret());
    }

    ctx.cookies.set('auth', `${user.gId}-${secret}-n`, {
        expires: secretExpires,
        path: '/',
        httpOnly: false
    });
};
