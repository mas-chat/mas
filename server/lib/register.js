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

var expressValidator = require('express-validator'),
	mysql = require('mysql'),
	crypto = require('crypto');

exports.handleRegister = function(req, res) {
	var body = req.body;

	req.assert('email', 'required').notEmpty();
	req.assert('email', 'valid email required').isEmail();
	req.assert('password', '6 to 20 characters required').len(6, 20);

	var mappedErrors = req.validationErrors(true); //kayta tata

	if (0) {
		res.send(200, {
			success: false,
			msg: 'Form error.'
		});
		return;
	}

    // Checks done, all is good

    var password = req.body.password;
    var passwordSha =
            crypto.createHash('sha256').update(password, 'utf8').digest('hex');

	var connection = mysql.createConnection({
		host: 'localhost',
		user: 'ircuser',
		password: 'zeppelin',
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
				console.log('Rows: ' + rows)
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
};