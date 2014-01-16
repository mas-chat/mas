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

var r = require('redis').createClient(),
    Q = require('q');

exports.authenticateUser = function *(cookie, sessionId) {
    if (!cookie) {
        this.status = 'unauthorized';
        return null;
    }

    var data = cookie.split('-');

    if (!data) {
        return {
            status: 'unauthorized',
            userId: null
        }
    }

    var userId = data[0];
    var cookie = data[1]; // TBD: bad name

    var validUser = yield validateUser(userId, cookie);

    if (!validUser) {
        return {
            status: 'unauthorized',
            userId: null
        }
    }

    var validSession = yield validateSession(userId, sessionId);
    if (validSession) {
        return {
            userId: userId
        }
    } else {
        return {
            status: 'not acceptable',
            userId: null
        }
    }
}

function *validateUser(userId, cookie) {
    var unixTime = Math.round(new Date().getTime() / 1000);

    if (!userId) {
        return null;
    }

    // Authenticate user.
    var expected = yield Q.nsend(r, 'hmget', 'user:' + userId, 'cookie_expires', 'cookie');

    if (expected && expected[0] > unixTime && expected[1] === cookie) {
        return true;
    } else {
        return false;
    }
}

function *validateSession(userId, sessionId) {
    if (sessionId !== 0) {
        var expectedSessionId = parseInt(yield Q.nsend(r, 'hget',  'user:' + userId, 'sessionId'));

        if (sessionId === expectedSessionId) {
            return true;
        } else {
            return false;
        }
    } else {
        return true;
    }
}