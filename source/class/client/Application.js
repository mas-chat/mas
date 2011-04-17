
qx.Class.define("client.Application",
{
    extend : qx.application.Standalone,

    members :
    {
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
	    var logDialog = new client.LogDialog(rpcmanager, settings, infoDialog);

	    infoDialog.settings = settings;
	    
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

	    var MainScreenObj = new client.MainScreen(rpcmanager, this.getRoot(), logDialog,
						      settings, infoDialog, anon_user);

	    infoDialog.mainscreen = MainScreenObj;
	    logDialog.mainscreen = MainScreenObj;
	    rpcmanager.mainscreen = MainScreenObj;
	}
    }
});

