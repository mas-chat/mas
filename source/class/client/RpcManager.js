
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
	this.__rrpc.setTimeout(35000);

	//global because of call from LogDialog, not optimal
	var d = new Date();
	this.timezone = d.getTimezoneOffset();

	//Initial hello, send TZ info, with timer we don't see rotating
	//circle in chrome
	qx.event.Timer.once(function(e){
	    this.__read();
	}, this, 250); 
    },

    members :
    {
	id : 0,
	sec : 0,
	cookie : 0,
	timezone : 0,
	mainscreen : 0,

	__errormode : false,
	__sendqueue : [],
	__srpc : 0,
	__rrpc : 0,
	__firstrpc : true,
	__helloseq : 0,
	__sendseq : 1,
	
	call : function(command, parameters)
	{
	    var obj = new Object();
	    obj.command = command;
	    obj.parameters = parameters;
	    this.__sendqueue.push(obj);
	    
	    debug.print("call: buffered: " + command + ": " + parameters + ", queue len: " +
			this.__sendqueue.length);

	    if (this.__sendqueue.length == 1)
	    {
		this.__sendCallRequest(obj);
	    }
	},

	__sendCallRequest : function(obj)
	{
	    if (this.__errormode == false) 
	    {
		this.mainscreen.setStatusText("L");
	    }

	    debug.print("call: sent: " + obj.command );

	    this.__srpc.callAsync(
		qx.lang.Function.bind(this.__sendresult, this),
		obj.command, this.id + " " + this.sec + " " + this.cookie + " " +
		    this.__sendseq + " " + obj.parameters);
	},

	__sendresult : function(result, exc)
	{
	    if (exc == null) 
	    {
                debug.print("call: answer: " + result);

		var options = result.split(" ");
		var command = options.shift();

		this.mainscreen.handleCommand(command, options);
				
		this.__requestDone(true, exc);
	    }
	    else 
	    {
		this.__requestDone(false, exc);
	    }
	},

	__read : function()
	{
	    debug.print("read sent: " + command + ": " + parameters);
	    tz = ""

	    if (this.__firstrpc == true)
	    {
		tz = this.timezone;
	    }

	    this.__rrpc.callAsync(
		qx.lang.Function.bind(this.__readresult, this),
		"HELLO", this.id + " " + this.sec + " " + this.cookie + " " +
		    "0" + " " + this.__helloseq + " " + tz);
	},
	
	__readresult : function(data, exc) 
	{
	    this.__helloseq++;

	    if (exc == null) 
	    {
		if (!this.__firstrpc)
		{
		    //First response is too big to be printed
	            debug.print("received: " + data);
                }
		else
		{
		    this.__firstrpc = false;
		}

		var commands = data.split("<>");

		for (var i=0; i < commands.length; i++)
		{
		    var options = commands[i].split(" ");
		    var command = options.shift();

		    //debug.print("handling:" + command + options.join(" "));

		    var result = this.mainscreen.handleCommand(command, options);

		    if (result == false)
		    {
			//Permanent error, bail out without making a new RPC request
			return;
		    }
		}
		
		this.__read();
	    }
	    else 
	    {
		if (this.__firstrpc == true)
		{
		    this.mainscreen.handleRpcError();
		}
		else
		{
		    if (exc.code == qx.io.remote.Rpc.localError.timeout)
		    {
			//Make next request immediately
			this.__read();
		    }
		    else
		    {
         	        debug.print("unusual error code: " + exc.code);

			//Wait a little and try again. This is to make sure
			//that we don't loop and consume all CPU cycles if
			//there is no connection.
			qx.event.Timer.once(function(e){
			    this.__read();
			}, this, 2000); 
		    }
		}
	    }
	},

	__requestDone : function(success, exc)
	{
	    if (success == true)
	    {
		this.__sendqueue.shift();
		this.__sendseq++;
		this.__errormode = false;
	    }
	    else
	    {
	        debug.print("rpcmanager: didnt get reply, code: " + exc.code);

		this.mainscreen.setStatusText("<font color=\"#ff0000\">Connection to server lost, recovering...</font>");
		this.__errormode = true;
	    }

	    if (this.__sendqueue.length > 0)
	    {
		var obj = this.__sendqueue[0];
		this.__sendCallRequest(obj);
	    }
	    else
	    {
		this.mainscreen.setStatusText("");
	    }
	}
    }
});
