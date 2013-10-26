
$(function() {
	$('#register-form').submit(function() {
		$.post(
			'/register',
			$(this).serialize(),
			function(data){
				$("#results").html(data)
			});
		return false;
	});
});
