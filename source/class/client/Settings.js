/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.Settings",
{
    extend : qx.core.Object,

    construct : function(params)
    {
	this.initdone = 0;

	// write "socket"
	this.__srpc = new qx.io.remote.Rpc("/", "ralph");
	this.__srpc.setTimeout(10000);

	var allsettings = params.split("||");

	for (var i=0; i < allsettings.length; i = i + 2)
	{
	    var key = allsettings[i];
	    var value = allsettings[i+1];

	    switch(key)
	    {
	    case "showFriendBar":
		this.setShowFriendBar(value);
		break;

	    case "firstTime":
		this.setFirstTime(value);
		break;

	    case "loggingEnabled":
		this.setLoggingEnabled(value);
		break;

	    case "sslEnabled":
		this.setSslEnabled(value);
		break;
	    }
	}
	this.initdone = 1;

    },

    //TODO: write proper destructor

    properties :
    {
	firstTime : { init : 1, apply : "_applyFirstTime" },
	showFriendBar : { init : 1, apply : "_applyShowFriendBar" },
	loggingEnabled : { init : 1, apply : "_applyLoggingEnabled" },
	sslEnabled : { init : 0, apply : "_applySslEnabled" }
    },

    members :
    {
	__srpc : 0,
	initdone : 0,

	_applyFirstTime : function(value) 
	{
	    this.send("firstTime", value);
	},

	_applyShowFriendBar : function(value) 
	{
	    this.send("showFriendBar", value);
	},

	_applyLoggingEnabled : function(value)
	{
	    this.send("loggingEnabled", value);
	},

	_applySslEnabled : function(value)
	{
	    this.send("sslEnabled", value);
	},

	send : function(name, value)
	{
	    if (this.initdone == 1)
	    {
		this.__srpc.callAsync(
		    this.sendresult,
		    "SET", global_ids + name + " " + value);
	    }
	},

	sendresult : function (result, exc)
	{
	    MainScreenObj.sendresult(result, exc);
	}
    }
});
