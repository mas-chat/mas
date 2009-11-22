/* ************************************************************************

#asset(projectx/*)
5B5B#require(qx.util.StringSplit)

************************************************************************ */

qx.Class.define("client.UserWindow",
{
    extend : qx.core.Object,

    construct : function(desktop, topic, nw, name, type, nw_id)
    {
	this.base(arguments);

	// write "socket"
	this.__srpc = new qx.io.remote.Rpc(
	    ralph_url + "/",
	    "ralph"
	);
	this.__srpc.setTimeout(10000);

	var layout = new qx.ui.layout.Grid();
	layout.setRowFlex(0, 1); // make row 0 flexible
	layout.setColumnFlex(0, 1); // make column 0 flexible
	layout.setColumnWidth(1, 100); // set with of column 1 to 200 pixel

	var wm1 = new qx.ui.window.Window("(" + nw + ") " + topic);
	wm1.userWindowRef = this;

	this.__nw = nw;
	this.__nw_id = nw_id;

	wm1.setLayout(layout);
	wm1.setModal(false);
	wm1.setAllowMaximize(true);
	wm1.moveTo(250, 150);
	
	// create scroll container
	this.__scroll = new qx.ui.container.Scroll();

	this.__scroll.set({
	    minWidth: 100,
	    minHeight: 50,
	    scrollbarY : "on"
	});

	var channelText = "Ready.<br>";
	
	this.__atom = new qx.ui.basic.Atom(channelText);
	this.__atom.setRich(true);
	
	this.__scroll.add(this.__atom);		       
	wm1.add(this.__scroll, {row: 0, column: 0, flex: 1});
	
	this.__input1 = new qx.ui.form.TextField();
	this.__input1.set({ maxLength: 200 });
	this.__input1.focus();

	this.__input1.addListener("keypress", function(e) {
	    if (e.getKeyIdentifier() == "Enter")
	    {
		var input = this.__input1.getValue();
	    
		if (input !== "")
		{
		    this.__srpc.callAsync(this.sendresult, "SEND", global_id + " " + global_sec + " " + this.winid + " " + input);
		    this.__input1.setValue("");

		    var currentTime = new Date();
		    var hour = currentTime.getHours();
		    var min = currentTime.getMinutes();

		    if (min < 10)
		    {
			min = "0" + min;
		    }

		    if (hour < 10)
		    {
			hour = "0" + hour;
		    }
		    
		    this.addline(hour + ":" + min + " <font color=\"blue\"><b>&lt;" + global_nick[this.__nw_id] + "&gt;</b> " + input + "</font><br>");
		}
	    }
	}, this);

	if (type != 2)
	{
	    wm1.add(this.__input1, {row: 1, column: 0});
	}

	if (type == 0)
	{
	    wm1.add(this.getList(), {row: 0, column: 1, rowSpan: 2, flex:1});
	}

	this.__window = wm1;
	this.__type = type;
	this.__name = name;

	this.__window.addListener("close", this.handleClose, this);

	desktop.add(wm1);

	this.changetopic(topic);
    },

    //TODO: write proper destructor

    members :
    {
        __window : 0,
	__input1 : 0,
	__list : 0,
	__atom : 0,
	__channelText : "",
	__scroll : 0,
	__srpc : 0,
	__lines : 0,
	winid : 0,
	__nw : 0,
	__nw_id : 0,
	__type : 0,
	__name : 0,
	
	handleResize : function(e) 
	{
	    var data = e.getData();
	    var width = data.width;
	    var height = data.height;

	    this.__srpc.callAsync(this.sendresult,
				  "RESIZE", global_id + " " + global_sec + " " + this.winid + " " +
				  width + " " + height);
	},

	handleClose : function(e)
	{
	    this.__srpc.callAsync(this.sendresult,
				  "CLOSE", global_id + " " + global_sec + " " + this.winid);
	},

	//TODO: handle beforeclose -> remove from mainscreen array

	setHeight : function(e)
	{
	    this.__window.setHeight(e);
	},

	setWidth : function(e)
	{
	    this.__window.setWidth(e);
	},

	getBounds : function()
	{
	    return this.__window.getBounds();
	},

	handleMove : function(e)
	{
	    var data = e.getData();
	    var x = data.left;
	    var y = data.top;

	    this.__srpc.callAsync(this.sendresult,
				  "MOVE", global_id + " " + global_sec + " " + this.winid + " " +
				  x + " " + y);
	},

	sendresult : function(result, exc) 
	{
	    if (exc == null) 
	    {
                var pos = result.search(/ /);
                var command = result.slice(0, pos);
                var param = result.slice(pos+1);
                
                if (command === "DIE")
                {
		    infoDialog.showInfoWin("Session terminated. <p>Press OK to return login page.",
					   true,
					   function () {
					       window.location = ralph_domain + "/?logout=yes";
					   });
		}
	    } 
	    else 
	    {
		infoDialog.showInfoWin("Lost connection to server.<p>Trying to recover...",
				       false);
		//TODO: Add delay ~2s here
		window.location.reload(true);
	    }
	},

	addHandlers : function()
	{
	    this.__window.addListener('resize', this.handleResize, this);
	    this.__window.addListener('move', this.handleMove, this);
	},

	moveTo : function(x,y)
	{
	    this.__window.moveTo(x, y);
	},

	show : function()
	{
	    this.__window.open();
    	},

	getName : function()
	{
	    return this.__name;
	},

	activate : function()
	{
	    this.__window.setShowStatusbar(true);
	},

	addline : function(line)
	{
	    this.__channelText = this.__channelText + line;

	    this.__lines++;

	    // limit lines
	    if (this.__lines > 100)
	    {
		var pos = this.__channelText.search(/<br>/i)
		this.__channelText = this.__channelText.substr(pos + 4);
	    }

	    this.__atom.setLabel(this.__channelText);

//	    var bottom = this.__scroll.getItemBottom(this.__atom);
	    this.__scroll.scrollToY(100000);
	},

	changetopic : function(line)
	{
	    var nw = "(" + this.__nw + " channel) ";
	    var cname = this.__name;

	    if(line == "")
	    {
		line = "Topic not set.";
	    }

	    if (this.__nw == "Evergreen" && this.__type == 0)
	    {
		cname = cname.substr(1, 1).toUpperCase() + cname.substr(2);
		nw = "Group: ";
	    }

	    if (this.__type == 2)
	    {
		this.__window.setCaption("System window - Moe version 0.4");
	    }
	    else if (this.__type == 0)
	    {
		this.__window.setCaption(nw + cname + " : " + line);
	    }
	    else
	    {
		this.__window.setCaption(nw + "*** Private conversion with " + cname);
	    }
	},

	addnames : function(line)
	{
	    if (this.__type == 0)
	    {
		this.__list.removeAll();

		var names = line.split(" ");
		
		for (var i=0; i < names.length; i++)
		{
		    var display = names[i];

		    if(names[i].charAt(0) == "@")
		    {
			display = "<b>" + display.substr(1) + "</b>"; 
		    }

		    var tmp = new qx.ui.form.ListItem(display).set(
			{ rich : true });
		    tmp.realnick = names[i];

		    this.__list.add(tmp);
		}
	    }
	},

	getList : function()
	{
	    var list = new qx.ui.form.List;
	    list.setContextMenu(this.getContextMenu());

	    list.add(new qx.ui.form.ListItem("Wait..."));
	    list.setAllowGrowY(true);
	    this.__list = list;

	    return list;
	},

	getContextMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var cutButton = new qx.ui.menu.Button("Start private chat with",
						  "icon/16/actions/edit-cut.png");

	    cutButton.addListener("execute", function(e) {

		// huh!
		var name = this.getLayoutParent().getOpener().getSelection()[0].realnick;
		
		var userwindow = 
		    this.getLayoutParent().getOpener().getLayoutParent().getLayoutParent().userWindowRef;

		userwindow.__srpc.callAsync(userwindow.sendresult,
					    "STARTCHAT", global_id + " " + global_sec + " " + 
					    userwindow.__nw + " " + name);
	    });

	    menu.add(cutButton);

	    return menu;
	}
    }
});
