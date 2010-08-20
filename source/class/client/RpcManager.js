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
	this.__srpc.setTimeout(20000);

	this.__rrpc = new qx.io.remote.Rpc("/ralph", "ralph");
	this.__rrpc.setTimeout(30000);
    },

    members :
    {
	id : 0,
	sec : 0,
	cookie : 0,
	mainscreen : 0,
	infoDialog : 0,
	seq : 1,
	errormode : false,
	__sendqueue : [],
	__srpc : 0,
	__rrpc : 0,
	
	call : function(command, parameters, context, callback)
	{
	    var obj = new Object();
	    obj.command = command;
	    obj.parameters = parameters;
	    obj.context = context;
	    obj.callback = callback;
	    this.__sendqueue.push(obj);
	    
	    debug.print("call: buffered: " + command + ": " + parameters + ", queue len: " + this.__sendqueue.length);

	    if (this.__sendqueue.length == 1)
	    {
		this.__sendCallRequest(obj);
	    }
	},

	__sendCallRequest : function(obj)
	{
	    var cb = obj.callback;

	    if (this.errormode == false) 
	    {
		this.mainscreen.setStatusText("L");
	    }

	    debug.print("call: sent: " + obj.command );

	    if (!cb)
	    {
		cb = this.__sendresult;
	    }

	    this.__srpc.callAsync(
		qx.lang.Function.bind(cb, obj.context),
		obj.command, this.id + " " + this.sec + " " + this.cookie + " " +
		    this.seq + " " + obj.parameters);
	},

	read : function(command, parameters, context, callback)
	{
	    debug.print("read sent: " + command + ": " + parameters);

	    this.__rrpc.callAsync(
		qx.lang.Function.bind(callback, context),
		command, this.id + " " + this.sec + " " + this.cookie + " " +
		    "0" + " " + parameters);
	},
	
	__sendresult : function(result, exc)
	{
	    if (exc == null) 
	    {
                var now = new Date();
                debug.print("call: answer: " + result);

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
                        "Error",
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

		    this.infoDialog.showInfoWin("Info", param, "OK");
		}
		
		rpcmanager.__sendqueue.shift();
		rpcmanager.seq++;
		rpcmanager.errormode = false;
	    }
	    else 
	    {
	        debug.print("rpcmanager: didnt get reply, code: " + exc.code);

		rpcmanager.mainscreen.setStatusText("<font color=\"#ff0000\">Connection to server lost, recovering...</font>");
		rpcmanager.errormode = true;
	    }

	    if (rpcmanager.__sendqueue.length > 0)
	    {
		var obj = rpcmanager.__sendqueue[0];
		rpcmanager.__sendCallRequest(obj);
	    }
	    else
	    {
		rpcmanager.mainscreen.setStatusText("");
	    }
	}
    }
});
