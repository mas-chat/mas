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

	    this.getRoot().removeAll();
	    var start_label = new qx.ui.basic.Label("Initializing...").set({
		font : new qx.bom.Font(12, ["Arial", "sans-serif"])});
	    
	    start_label.setMargin(10,10,10,10);
	    this.getRoot().add(start_label, {flex : 1});

	    var srpc = new client.RpcManager();
	    var infoDialog = new client.InfoDialog(srpc);
	    srpc.infoDialog = infoDialog;

	    var settings = new client.Settings(srpc, "");
	    var logDialog = new client.LogDialog(srpc, settings);
	    
	    var cookie = qx.bom.Cookie.get("ProjectEvergreen");

	    if (cookie == null)
	    {
		qx.bom.Cookie.del("ProjectEvergreen");
		window.location.reload(true);
	    }

	    var idstring = cookie.split("-");
	    srpc.id = idstring[0];
	    srpc.sec = idstring[1];

	    var anon_user = false;

	    if (idstring[2] == "a")
	    {
		anon_user = true;
	    }

	    var label = new qx.ui.embed.Html("<object classid=\"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000\" codebase=\"http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,0,0\" width=\"0\" height=\"0\" id=\"niftyPlayer1\" align=\"\"><param name=movie value=\"/moescript/niftyplayer.swf?file=/moescript/betty.mp3\"><param name=quality value=high><embed src=\"/moescript/niftyplayer.swf?file=/moescript/betty.mp3\" quality=high bgcolor=#FFFFFF width=\"0\" height=\"0\" name=\"niftyPlayer1\" align=\"\" type=\"application/x-shockwave-flash\" pluginspage=\"http://www.macromedia.com/go/getflashplayer\"></embed></object>");
	    this.getRoot().add(label);

	    var MainScreenObj = new client.MainScreen(srpc, this.getRoot(), logDialog,
						      settings, infoDialog, anon_user);
	    infoDialog.mainscreen = MainScreenObj;
	    logDialog.mainscreen = MainScreenObj;
	}
    }
});

