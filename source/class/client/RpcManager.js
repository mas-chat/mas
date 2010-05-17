/* ************************************************************************

#asset(projectx/*)
#require(qx.util.StringSplit)

************************************************************************ */

qx.Class.define("client.RpcManager",
{
    extend : qx.core.Object,

    construct : function()
    {
	this.base(arguments);
	
	// write "socket"
	this.__srpc = new qx.io.remote.Rpc("/ralph", "ralph");
	this.__srpc.setTimeout(15000);

	this.__rrpc = new qx.io.remote.Rpc("/ralph", "ralph");
	this.__rrpc.setTimeout(30000);
    },

    members :
    {
	id : 0,
	sec : 0,
	cookie : 0,
	infoDialog : 0,

	__srpc : 0,
	__rrpc : 0,
	
	call : function(command, parameters, context)
	{
	    this.__srpc.callAsync(
		qx.lang.Function.bind(this.__sendresult, context),
		command, this.id + " " + this.sec + " " + this.cookie + " " +
		    parameters);
	},

	read : function(command, parameters, context, callback)
	{
	    this.__rrpc.callAsync(
		qx.lang.Function.bind(callback, context),
		command, this.id + " " + this.sec + " " + this.cookie + " " +
		    parameters);
	},
	
	__sendresult : function(result, exc)
	{
	    if (exc == null) 
	    {
		//TODO: BIG HACK -> fix the protocol!!!
		if (result.charAt(0) == "1")
		{
		    result = result.substr(2);
		}

		var pos = result.search(/ /);
		var command = result.slice(0, pos);
		
		if (command == "KEY")
		{
		    //context UserWindow
		    result = result.slice(pos+1);
		    this.apikey.setValue(result);    
		}
		else if (command == "OPERLIST")
		{
		    //context UserWindow
		    result = result.slice(pos+1);
		    var opers = result.split("<<>>"); 
		    
		    this.configListOper.removeAll();
		    
		    for (var i=0; i < opers.length; i++)
		    {
			var tmp = opers[i].split("<>");
			var tmpList = new qx.ui.form.ListItem(tmp[1]);
			tmpList.userid = tmp[0];
			this.configListOper.add(tmpList);
		    }
		}
		else if (command == "BANLIST")
		{
		    //context UserWindow
		    result = result.slice(pos+1);
		    var bans = result.split("<<>>"); 
		    
		    this.configListBan.removeAll();

		    for (var i=0; i < bans.length; i++)
		    {
			var tmp = bans[i].split("<>");
			var tmpList = new qx.ui.form.ListItem(tmp[0]);
			tmpList.banid = tmp[1];
			this.configListBan.add(tmpList);
		    }
		}
		else if (command == "DIE")
		{
		    this.infoDialog.showInfoWin(
			"Session terminated. <p>Press OK to restart.",
			"OK", function () {
			    qx.bom.Cookie.del("ProjectEvergreen");
			    window.location.reload(true);
			});
		}
		else if (command == "INFO")
		{
                    var param = result.slice(pos+1);

		    //TODO: big bad hack, fix: proper protocol
		    if (param.substr(0, 30) == "You are already chatting with ")
		    {
			//context mainscreen
			this.removeWaitText(this.globalflist, param.substr(30));
		    }

		    this.infoDialog.showInfoWin(param, "OK");
		}
	    }
	    else 
	    {
		this.infoDialog.showInfoWin("Lost connection to server. (" + exc + ")<p>Trying to recover...");

		qx.event.Timer.once(
		    function(e) { window.location.reload(true); }, this, 2000);
	    }
	}
    }
});
