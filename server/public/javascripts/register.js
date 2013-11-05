
require(["/vendor/javascripts/jqBootstrapValidation.js"], function(validation) {

	$(function() {
		$("#register-form input, #register-form select, #register-form textarea").not("[type=submit]").jqBootstrapValidation({
			preventSubmit: true,
			submitError: function($form, event, errors) {
				alert("NOT OK");

				event.preventDefault();
            },
            submitSuccess: function($form, event) {
            	alert("OK");

            	$.post('/register',
            		$('#register-form').serialize(),
            		function(data) {
            			if (data.success == true) {
            				//TBD
            			} else {
            				$('#error-msg').text(data.msg);
            				$('#error-msg').css('visibility','visible')
            			}
            		});
       
            	event.preventDefault();
            },
            filter: function() {
            	return $(this).is(":visible");
            }
        });
	});
});
