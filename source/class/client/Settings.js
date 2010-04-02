/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.Settings",
{
    extend : qx.core.Object,

    construct : function(srpc, params)
    {
	this.rpc = srpc;
	this.update(params);
    },

    //TODO: write proper destructor

    properties :
    {
	firstTime : { init : 1, apply : "_applyFirstTime" },
	loggingEnabled : { init : 1, apply : "_applyLoggingEnabled" },
	sslEnabled : { init : 0, apply : "_applySslEnabled" }
    },

    members :
    {
	rpc : 0,
	initdone : 0,

	update : function(params)
	{
	    this.initdone = 0;
	    
	    var allsettings = params.split("||");
	    
	    for (var i=0; i < allsettings.length; i = i + 2)
	    {
		var key = allsettings[i];
		var value = allsettings[i+1];
		
		switch(key)
		{
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

	_applyFirstTime : function(value) 
	{
	    this.send("firstTime", value);
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
		this.rpc.call("SET", name + " " + value);
	    }
	}
    }
});
