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
		ralph_port = "";
		ralph_domain = "http://meetandspeak.com";
	    }
	    else
	    {
		ralph_port = ":4444";
		ralph_domain = "http://portaali.org";
	    }

	    ralph_url = ralph_domain + ralph_port + "/ralph";

	    infoDialog = new client.InfoDialog();
	    logDialog = new client.LogDialog();

	    global_settings = new client.Settings("");
	    global_tmpcookie = 0;

	    var idstring = qx.bom.Cookie.get("ProjectEvergreen").split("-");
	   
	    global_id = idstring[0]; 
	    global_sec = idstring[1];
	    global_ids = global_id + " " + global_sec + " " + global_tmpcookie + " ";

	    if (idstring[2] == "a")
	    {
		global_anon = true;
	    }
	    else
	    {
		global_anon = false;
	    }

	    this.getRoot().removeAll();

	    var ralph_addr = ralph_domain + ralph_port;

	    var label = new qx.ui.embed.Html("<object classid=\"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000\" codebase=\"http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,0,0\" width=\"0\" height=\"0\" id=\"niftyPlayer1\" align=\"\"><param name=movie value=\"" + ralph_addr + "/moescript/niftyplayer.swf?file=" + ralph_addr + "/moescript/betty.mp3\"><param name=quality value=high><embed src=\"" + ralph_addr + "/moescript/niftyplayer.swf?file=" + ralph_addr + "/moescript/betty.mp3\" quality=high bgcolor=#FFFFFF width=\"0\" height=\"0\" name=\"niftyPlayer1\" align=\"\" type=\"application/x-shockwave-flash\" pluginspage=\"http://www.macromedia.com/go/getflashplayer\"></embed></object>");
	    this.getRoot().add(label);

	    MainScreenObj = new client.MainScreen(this.getRoot());
	}
    }
});

