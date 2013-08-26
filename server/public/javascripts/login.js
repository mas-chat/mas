/*
 *jQuery Timer plugin v0.1
 *Matt Schmidt [http://www.mattptr.net]
 *Licensed under the BSD License:
 */

jQuery.timer = function (interval, callback) {
    var interval = interval || 100;
    if (!callback) {
	return false;
    }

    _timer = function (interval, callback) {
	this.stop = function () {
	    clearInterval(self.id);
	};
	this.internalCallback = function () {
	    callback(self);
	};

	this.reset = function (val) {
	    if (self.id) {
		clearInterval(self.id);
            }

	    var val = val || 100;
	    this.id = setInterval(this.internalCallback, val);
	};
	this.interval = interval;
	this.id = setInterval(this.internalCallback, this.interval);

	var self = this;
    };
    return new _timer(interval, callback);
};

var mode = 0;

$(function(){ $("label").inFieldLabels(); });

function changeMode(newmode) {
    if (newmode == 1) {
	mode = 1;
	$('#topic').text("Enter Your Email Address");
	$('#password').hide();
	$('#pwlabel').hide();
	$('#rememberme').hide();
	$('#remembermeLabel').hide();
	$('#forgottext').text("Back to Login");
	$('#login').val("Proceed");
	$('#username').val(null);
	$('#nicklabel').text("Email Address");
	$('#openidlogin').hide();
    } else if (newmode == 0) {
	mode = 0;
	$('#topic').text("Login to MeetAndSpeak");
	$('#password').show();
	$('#pwlabel').show();
	$('#rememberme').show();
	$('#remembermeLabel').show();
	$('#forgottext').text("Forgot password?");
	$('#login').val("Login");
	$('#username').val(null);
	$('#nicklabel').text("Nick");
	$('#openidlogin').show();
    } else if (newmode == 2) {
	mode = 2;
	$('#topic').text("Enter Your OpenID URL");
	$('#password').hide();
	$('#pwlabel').hide();
	$('#rememberme').show();
	$('#remembermeLabel').show();
	$('#forgottext').text("Back to Password Login");
	$('#login').val("Login");
	$('#username').val(null);
	$('#nicklabel').text("OpenID URL");
	$('#openidlogin').hide();
    }
}

function send() {
    $('#error').hide();
    $('#loading').show();

    if (mode == 0 || mode == 1) {
	send_lisa();
    } else if (mode == 2) {
	if ($("#rememberme").val() == "on") {
	    $.cookie("OIDrem", "yes",
		     { path: '/', expires: 14 });
        } else {
	    $.cookie("OIDrem", "no",
		     { path: '/', expires: 14 });
	}

	send_openid($("#username").val());
    }
}

function send_openid(openidurl) {
    $.ajax({
        type: "POST",
        url: "/tools/openid.pl",
	cache: false,
        data:  {url: openidurl},
        success: function(data) {
	    var param = data.split(" ");

	    if (param[0] == 1) {
                alert("Invalid OpenID URL. (error: " + data + ")");
            } else {
                window.location = param[1];
            }
        },
	failure: function() {
	    alert("Network problem");
	    $('#loading').hide();
	}
    });
}

function send_lisa() {
    var rememberme = 0
    if (mode == 0 && $("#rememberme").val() == "on")
	rememberme = 1;

    var dataString;

    if (mode == 0)
	postData = {
            emailOrNick: $("#username").val(),
            password: $("#password").val(),
            rememberMe: rememberme
        };
    else
	postData = {
            oper: "resetpw",
            emailOrNick: $("#username").val()
        };

    $.ajax({
        type: "POST",
        url: "/login",
	cache: false,
        processData: false,
	contentType: "application/json",
        data: JSON.stringify(postData),
        success: function(data) {
	    if (mode == 0)
	    {
                console.log(data);

		var resp = $.evalJSON(data);
		var id = resp.userId;
		var sec = resp.secret;
		var usessl = resp.useSsl;

		if (id == 0)
		{
		    $('#error').show();
		    $('#loading').hide();
		    $.cookie("ProjectEvergreen", null);
		}
		else
		{
		    var expiresdate = null;
		    if (rememberme == 1)
			expiresdate = 14;

		    $.cookie("ProjectEvergreen", id + "-" + sec + "-n",
			     { path: '/', expires: expiresdate });

		    if (usessl == 1)
			$.cookie("UseSSL", "yes", { path: '/', expires: 100 });
		    else
			$.cookie("UseSSL", "no", { path: '/', expires: 100 });

		    window.location.pathname = "/main/source/";
		}
	    }
	    else
	    {
		$('#loading').hide();
		alert("You will get password recovery mail soon if the email address " +
		      "you provided is found from the database ");
		changeMode(0);
	    }
        },
	failure: function() {
	    alert("Network problem");
	    $('#loading').hide();
	}
    });
}

$(document).ready(function(){
    $(".tweet").tweet({
	username: "masupdates",
	join_text: "auto",
	avatar_size: 15,
	count: 3,
	auto_join_text_default: ":",
	auto_join_text_ed: "we",
	auto_join_text_ing: "we were",
	auto_join_text_reply: "we replied to",
	auto_join_text_url: "we were checking out",
	loading_text: ""
    });

    $('#error').hide();
    $('#loading').hide();

    if (!($.browser.mozilla == true && $.browser.version == '2.0' ))
    {
	$('#fferror').hide();
    }

    $('#forgottext').click(function(event) {
	event.preventDefault();
	if (mode == 0)
	    changeMode(1);
	else
	    changeMode(0);
    });

    $('#openidlogin').click(function(event) {
        event.preventDefault();
	changeMode(2);
    });

    $('#googlelogin').click(function(event) {
        event.preventDefault();
        send_openid("https://www.google.com/accounts/o8/id");
    });

    $('#yahoologin').click(function(event) {
        event.preventDefault();
        send_openid("http://www.flickr.com");
    });

    $('#register').click(function() {
	window.location = "register.html";
    });

    $('#password').keydown (function(event) {
	if (event.keyCode == 13) {
	    event.preventDefault();
	    $('#login').trigger('click');
	}
    });

    $('#login').click (function(event) {
	send();
	event.preventDefault();
    });

    $('#username').focus();

    $.timer(100, function (timer) {
	if ($("#username").val() != "" || $("#password").val() != "")
	{
	    $('#nicklabel').hide();
			    $('#pwlabel').hide();
	}
    });
});
