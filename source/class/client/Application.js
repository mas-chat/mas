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
		__rpc = new qx.io.remote.Rpc(
		    "http://evergreen_dev.portaali.org/lisa/jsonrpc.pl",
		    "lisa.main" );
	    }

	    __rpc.setCrossDomain(true);

	    var cookie = qx.bom.Cookie.get("ProjectEvergreen");

	    if(cookie !== null)
	    {
		alert("cookie is set: " + cookie);
	    }
	    
	    alert("cookie is: " + cookie);

	    loginForm = new client.Login(__rpc, this);
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

