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
   
	    __rpc = new qx.io.remote.Rpc(
		"http://evergreen.portaali.org/svn/lisa/jsonrpc.pl",
		"qooxdoo.test"
	    );
	    __rpc.setCrossDomain(true);

//	    var sample_form = new client.draw.About();
//	    var doc = this.getRoot();

//	    doc.add(sample_form.getWidget(), {edge:0});

	    loginForm = new client.Login(__rpc, this);
	    registrationForm = new client.Registration(__rpc);

	    loginForm.show(this.getRoot());

//	    this.loginDone();
	},

	loginDone : function()
	{
	    this.getRoot().removeAll();
	    mainView = new client.MainScreen();
	    mainView.show(this.getRoot());
	}
    }
});

