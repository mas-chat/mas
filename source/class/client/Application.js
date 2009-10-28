/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.Application",
{
    extend : qx.application.Standalone,

    members :
    {
	__rpc : 0,
	
	main : function()
	{
	    this.base(arguments);
	
	    qx.log.appender.Console;

	    // install.sh changes the port
	    ralph_port = 9999; 		

	    if (ralph_port == 80)
	    {
		ralph_domain = "http://a167.myrootshell.com";

		//production
		__rpc = new qx.io.remote.Rpc(
		    "http://a167.myrootshell.com:8080/lisa/jsonrpc.pl",
		    "lisa.main" );
	    }
	    else
	    {
		ralph_domain = "http://evergreen_dev.portaali.org:9999";

		__rpc = new qx.io.remote.Rpc(
		    "http://evergreen_dev.portaali.org/lisa/jsonrpc.pl",
		    "lisa.main" );
	    }

	    infoDialog = new client.InfoDialog();

	    __rpc.setCrossDomain(true);

	    var cookie = qx.bom.Cookie.get("ProjectEvergreen");

	    loginForm = new client.Login(__rpc, this);

	    if(cookie !== null)
	    {
		__rpc.callAsync(loginForm.result, "login_cookie", cookie);
	    }

	    registrationForm = new client.Registration(__rpc);

	    loginForm.show(this.getRoot());

	},

	loginDone : function()
	{
	    this.getRoot().removeAll();
	    mainView = new client.MainScreen();
	    mainView.show(this.getRoot());
	}
    }
});

