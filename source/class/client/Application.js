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
		__rpc = new qx.io.remote.Rpc(
		    "http://evergreen.portaali.org/lisa/jsonrpc.pl",
		    "lisa.main" );
	    }
	    else
	    {
		__rpc = new qx.io.remote.Rpc(
		    "http://evergreen_dev.portaali.org/lisa/jsonrpc.pl",
		    "lisa.main" );
	    }

	    __rpc.setCrossDomain(true);

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

