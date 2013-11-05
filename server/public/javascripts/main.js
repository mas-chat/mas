require.config({
    baseUrl: '/javascripts',
    paths: {
        // the left side is the module ID,
        // the right side is the path to
        // the jQuery file, relative to baseUrl.
        // Also, the path should NOT include
        // the '.js' file extension. This example
        // is using jQuery 1.9.0 located at
        // js/lib/jquery-1.9.0.js, relative to
        // the HTML page.
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
					if (data.success == true) {
						var expiresdate = null;
						if (1) {
							//TBD
							expiresdate = 14;
						}

						$.cookie("ProjectEvergreen", data.userId + "-" + data.secret + "-n",
							{ path: '/', expires: expiresdate });    

            		    window.location.pathname = "/main/source/";
            	    } else {
            	    	$("#email-or-nick").simpletip({
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