
qx.Class.define("client.Application",
{
    extend : qx.application.Standalone,

    members :
    {
	__rpc : 0,
	
	main : function()
	{
	    this.base(arguments); 

	    qx.log.appender.Console; //disable someday
	    
	    this.getRoot().removeAll();
	    this.getRoot().set({backgroundColor: "#FFFFFF"});

	    var start_label = new qx.ui.basic.Label("<center><img src=\"/i/ajax-loader.gif\"><br><br><br>Loading content...</center>").set({
		font : new qx.bom.Font(14, ["Arial", "sans-serif"]), width:300, height:150, rich: true});

	    var margin_x = Math.round(qx.bom.Viewport.getWidth()/2)-300/2;
	    var margin_y = Math.round(qx.bom.Viewport.getHeight()/2);
	    
	    start_label.setMargin(margin_y,10,10,margin_x);
	    this.getRoot().add(start_label, {flex : 1});

	    var rpcmanager = new client.RpcManager();
	    var infoDialog = new client.InfoDialog(rpcmanager);

	    var settings = new client.Settings(rpcmanager, "");
	    infoDialog.settings = settings;

	    var logDialog = new client.LogDialog(rpcmanager, settings, infoDialog);
	    
	    var cookie = qx.bom.Cookie.get("ProjectEvergreen");

	    if (cookie == null)
	    {
		qx.bom.Cookie.del("ProjectEvergreen");
		window.location.reload(true);
	    }

	    var idstring = cookie.split("-");
	    rpcmanager.id = idstring[0];
	    rpcmanager.sec = idstring[1];

	    var anon_user = false;

	    if (idstring[2] == "a")
	    {
		anon_user = true;
	    }

	    var label = new qx.ui.embed.Html("<object classid=\"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000\" codebase=\"http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,0,0\" width=\"0\" height=\"0\" id=\"niftyPlayer1\" align=\"\"><param name=movie value=\"/moescript/niftyplayer.swf?file=/moescript/betty.mp3\"><param name=quality value=high><embed src=\"/moescript/niftyplayer.swf?file=/moescript/betty.mp3\" quality=high bgcolor=#FFFFFF width=\"0\" height=\"0\" name=\"niftyPlayer1\" align=\"\"></embed></object>");
	    this.getRoot().add(label);

	    var MainScreenObj = new client.MainScreen(rpcmanager, this.getRoot(), logDialog,
						      settings, infoDialog, anon_user);
	    rpcmanager = rpcmanager;

	    infoDialog.mainscreen = MainScreenObj;
	    logDialog.mainscreen = MainScreenObj;
	    rpcmanager.mainscreen = MainScreenObj;
	}
    }
});

