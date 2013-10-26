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

var expressValidator = require('express-validator');

exports.handleRegister = function(req, res) {
	req.assert('email', 'required').notEmpty();
	req.assert('email', 'valid email required').isEmail();
	req.assert('password', '6 to 20 characters required').len(6, 20);

	var mappedErrors = req.validationErrors(true);

	res.send(200, "Hello World\n" + errors.toString);
};