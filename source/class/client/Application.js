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

	    if (ralph_port == 8080)
	    {
		ralph_domain = "http://a167.myrootshell.com:8080";
	    }
	    else
	    {
		ralph_domain = "http://evergreen_dev.portaali.org:9999";
	    }

	    infoDialog = new client.InfoDialog();
	
	    var query = window.location.search;

	    global_id = this.gup('id');
	    global_sec = this.gup('token');

	    this.getRoot().removeAll();
	    mainView = new client.MainScreen();
	    mainView.show(this.getRoot());
	},

	gup : function( name )
	{
	    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	    var regexS = "[\\?&]"+name+"=([^&#]*)";
	    var regex = new RegExp( regexS );
	    var results = regex.exec( window.location.href );
	    if( results == null )
		return "";
	    else
		return results[1];
	}
    }
});

