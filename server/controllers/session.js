//
//   Copyright 2013 Ilkka Oksanen <iao@iki.fi>
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

// User object hides the storage details of attributes. Information
// that can't be lost is stored in MySQL. Everything else is kept
// in Redis for performance reasons.

module.exports = function() {
    return function(req, res, next) {
        var dataString = req.cookies.ProjectEvergreen;
        req.user = undefined;

        if (dataString) {
            var data = dataString.split('-');
            var id = data[0];

            fetchUserData(id, req, next);
        } else {
            next();
        }
    }
};
