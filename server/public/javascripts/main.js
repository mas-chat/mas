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

require.config({
    baseUrl: '/javascripts',
    paths: {
        'jquery': '/vendor/javascripts/jquery.min',
        'jquery-simpletip': '/vendor/javascripts/jquery.simpletip-1.3.1',
        'jquery-cookie': '/vendor/javascripts/jquery.cookie'
    },
    shim: {
        'jquery-simpletip': {
            deps: ['jquery'],
            exports: 'jQuery.fn.simpletip'
        },
        'jquery-cookie': {
            deps: ['jquery']
        }
    }
});

require([
	'jquery',
	'jquery-simpletip',
	'jquery-cookie'
	], function($) {

	$(function() {

		$('#login-form').submit(function() {
			$.post('/login',
				$('#login-form').serialize(),
				function(data) {
					if (data.success === true) {
                        var expiresdate = null;
                        if (1) {
							//TBD
							expiresdate = 14;
						}

						$.cookie('ProjectEvergreen', data.userId + '-' + data.secret + '-n',
							{ path: '/', expires: expiresdate });

                        window.location.pathname = '/app/';
                    } else {
                        $('#email-or-nick').simpletip({
                            content: data.msg,
                            fixed: true,
                            position: 'bottom',
                            hidden: false,
                            persistent: true
                        });
                    }
                });

			return false;
		});
	});
});