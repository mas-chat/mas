xf/* ************************************************************************

#asset(projectx/*)
5B5B#require(qx.util.StringSplit)

************************************************************************ */

qx.Class.define("client.UserWindow",
{
    extend : qx.core.Object,

    construct : function(desktop, topic, nw, name, type, sound, titlealert,
			 nw_id, usermode, password, new_msgs)
    {
	this.base(arguments);

	// write "socket"
	this.__srpc = new qx.io.remote.Rpc("/ralph", "ralph");
	this.__srpc.setTimeout(10000);

	var layout = new qx.ui.layout.Grid();
	layout.setRowFlex(0, 1); // make row 0 flexible
	layout.setColumnFlex(0, 1); // make column 0 flexible
	layout.setColumnWidth(1, 100); // set with of column 1 to 200 pixel
	layout.setColumnAlign(1, "center", "middle");

	var wm1 = new qx.ui.window.Window();
	wm1.userWindowRef = this;

	this.__nw = nw;
	this.__nw_id = nw_id;
	this.sound = sound;
	this.titlealert = titlealert;
	this.__usermode = usermode;
	this.__password = password;
	this.__newmsgsatstart = new_msgs;

	wm1.setModal(false);
	wm1.setLayout(new qx.ui.layout.VBox(0));
	wm1.setAllowMaximize(true);
	wm1.moveTo(250, 150);
	wm1.setResizeSensitivity(10);
	wm1.set({contentPadding: [0,0,0,0]});

	var box1 = new qx.ui.container.Composite(layout);
	box1.set({backgroundColor: "#F2F5FE", padding:10, margin: 0});
	wm1.add(box1, {flex:1});

	// create scroll container
	this.__scroll = new client.Scroll();

	this.__scroll.addListener("scrollLock", function(e) {

	    var caption = this.window.getCaption();

	    if (e.getData() == true)
	    {
		this.window.setCaption("[SCROLL LOCK] " + caption);
		this.scrollLock = true;
	    }
	    else
	    {
		this.window.setCaption(caption.replace(/^\[SCROLL LOCK\] /, ""));
		this.scrollLock = false;
	    }
	}, this);

	this.__scroll.set({
	    minWidth: 100,
	    minHeight: 50,
	    scrollbarY : "on"
	});

	var channelText = "Please wait...<br>";
	
	this.__atom = new qx.ui.basic.Label(channelText);
	this.__atom.setRich(true);
	this.__atom.set({ backgroundColor: "#F2F5FE", selectable: true, nativeContextMenu : true});

	this.__scroll.add(this.__atom);		       
	box1.add(this.__scroll, {row: 0, column: 0, flex: 1});
	
	this.__input1 = new qx.ui.form.TextField();
	this.__input1.set({ maxLength: 200 });
	this.__input1.setMarginTop(2);
	this.__input1.focus();

	var searchstart = 0;
	var searchstring = "";
	var extendedsearch = false;

	this.__input1.addListener("keypress", function(e) {

	    if (e.getKeyIdentifier() == "Enter")
	    {
		var input = this.__input1.getValue();
	    
		if (input !== "" && input !== null)
		{
		    this.__srpc.callAsync(
			this.sendresult,
			"SEND", global_ids + this.winid + " " + input);
		    this.__input1.setValue("");

		    input = input.replace(/</g, "&lt;");
		    input = input.replace(/>/g, "&gt;");

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
		 
		    var mynick = " <font color=\"blue\"><b>&lt;" +
			global_nick[this.__nw_id] + "&gt;</b> ";

		    if (input.substr(0,4) == "/me ")
		    {
			input = input.substr(4);
			mynick = " <font color=\"blue\"><b>* " +
			    global_nick[this.__nw_id] + "</b> ";
		    }
		    
		    if (input.substr(0,1) != "/")
		    {
			this.addline(hour + ":" + min + mynick + input + "</font><br>");
		    }
		}
	    }
	    else if (e.getKeyIdentifier() == "PageUp")
	    {
		this.__scroll.scrollByY((this.__scroll.getHeight() - 30) * - 1);
	    }
	    else if (e.getKeyIdentifier() == "PageDown")
	    {
		this.__scroll.scrollByY(this.__scroll.getHeight() - 30);
	    }
	    else if (e.getKeyIdentifier() == "Down")
	    {
		MainScreenObj.activateNextWin("down");
	    }
	    else if (e.getKeyIdentifier() == "Up")
	    {
		MainScreenObj.activateNextWin("up");
	    }
	    else if (e.getKeyIdentifier() == "Tab" && this.__type == 0)
	    {
		var input2 = this.__input1.getValue();

		if (input2 == null)
		{
		    input2 = "";
		}

		if (input2.length == 0 || input2.search(/^\S+\s*$/) != -1)
		{
		    var names = this.__list.getChildren();

		    if (extendedsearch == false)
		    {
			extendedsearch = true;
			searchstring = input2;
		    }

		    var found = false;

		    for (var i=searchstart; i < names.length; i++)
		    {
			var name = names[i].realnick;	
	    
			if(name.charAt(0) == "@" || name.charAt(0) ==  "+")
			{
			    //TODO: get rid of @ and + in realname if possible
			    name = name.substr(1);
			}

			if (name.substr(0, searchstring.length).toLowerCase() == searchstring.toLowerCase())
			{
			    this.__input1.setValue(name + ": ");
			    this.__input1.setTextSelection(100,100);
			    searchstart = i + 1;
			    found = true;
			    break;
			}
		    }

		    if (!found)
		    {
			searchstart = 0;
		    }
		}

		e.stopPropagation();
		e.preventDefault();
	    }

	    if (e.getKeyIdentifier() != "Tab")
	    {
		searchstart = 0;
		searchstring = "";
		extendedsearch = false;
	    }

	}, this);

	var icomposite = new qx.ui.container.Composite(new qx.ui.layout.HBox(5));
	icomposite.add(this.__input1, { flex : 1 });

	box1.add(icomposite, {row: 1, column: 0});

	this.prefButton = new qx.ui.form.ToggleButton("Settings");
	this.prefButton.setFocusable(false);
	this.prefButton.setMargin(2,10,2,10);

	this.prefButton.addListener("changeValue", function(e) {
	    if (e.getData() == true)
	    {
		this.__settingsmode = 1;
		if (this.__settings == 0)
		{
		    this.__settings = this.getSettingsView();		    
		}
		this.topicInput.setValue(this.__topic);
		this.pwInput.setValue(this.__password);

		if (this.__usermode == 2)
		{
		    this.configListOper.removeAll();
		    this.configListOper.add(new qx.ui.form.ListItem("Refreshing..."));
		    
		    this.__srpc.callAsync(qx.lang.Function.bind(this.sendresult, this),
					  "GETOPERS", global_ids + this.winid);
		}

		if (this.__usermode != 0)
		{
		    this.configListBan.removeAll();
		    this.configListBan.add(new qx.ui.form.ListItem("Refreshing..."));

		    this.__srpc.callAsync(qx.lang.Function.bind(this.sendresult, this),
					  "GETBANS", global_ids + this.winid);
		}

		box1.remove(this.__scroll);
		if (type == 0)
		{
		    box1.remove(this.__list);
		}
		box1.add(this.__settings, {row : 0, column : 0 });
		this.prefButton.setLabel("Back");
	    }
	    else
	    {
		this.__settingsmode = 0;
		if (this.__settings != 0)
		{
		    box1.remove(this.__settings);
		}

		box1.add(this.__scroll, { row:0, column :0});
		if (type == 0)
		{
		    box1.add(this.__list, { row:0, column :1});
		}
		this.prefButton.setLabel("Settings");
	    }
	}, this);

	if (type == 0)
	{
	    box1.add(this.getList(), {row: 0, column: 1, flex:1});
	    box1.add(this.prefButton, {row: 1, column: 1});
	}
	else
	{
	    icomposite.add(this.prefButton);
	}

	this.window = wm1;
	this.__type = type;
	this.__name = name;

	desktop.add(wm1);

	this.changetopic(topic);
    },

    //TODO: write proper destructor
    members :
    {
        window : 0,
	__input1 : 0,
	__list : 0,
	hidden : false,
	__atom : 0,
	__channelText : "",
	__scroll : 0,
	__srpc : 0,
	__lines : 0,
	__settings : 0,
	__settingsmode : 0,
	winid : 0,
	__nw : 0,
	__nw_id : 0,
	__type : 0,
	__taskbarButtonColor : "cccccc",
	__name : 0,
	__usermode : 0,
	__newmsgsatstart : 0,
	taskbarControl : 0,
	titlealert : 0,
	sound : 0,
	configListBan : 0,
	configListOper : 0,
	nameslist : [],
	closeok : 0,
	scrollLock : false,
	isRed : false,

	updateValues : function(topic, nw, name, type, sound, titlealert, nw_id, usermode, password)
	{
	    this.__password = password;
	    this.__usermode = usermode;
	    this.__topic = topic;

	    if (this.__settingsmode == 1)
	    {
		//realtime update
		this.topicInput.setValue(this.__topic);
		this.pwInput.setValue(this.__password);
	    }
	},
	
	handleResize : function(e) 
	{
	    var data = e.getData();
	    var width = data.width;
	    var height = data.height;

	    if (MainScreenObj.initdone == 1)
	    {
		this.__srpc.callAsync(this.sendresult,
				      "RESIZE", global_ids + this.winid + " " +
				      width + " " + height);
	    }
	},

	handleClose : function(e)
	{
	    this.__srpc.callAsync(this.sendresult,
				  "CLOSE", global_ids + this.winid);
	},

	//TODO: handle beforeclose -> remove from mainscreen array

	setHeight : function(e)
	{
	    this.window.setHeight(e);
	},

	setWidth : function(e)
	{
	    this.window.setWidth(e);
	},

	getBounds : function()
	{
	    return this.window.getBounds();
	},

	setRed : function()
	{
	    this.__taskbarButtonColor = "ffaaaa";
	    this.updateButton();
	    this.isRed = true;
	},

	setGreen : function()
	{
	    this.__taskbarButtonColor = "aaffaa";
	    this.updateButton();
	    this.isRed = false;
	},

	setNormal : function()
	{ 
	    this.__taskbarButtonColor = "cccccc";
	    this.updateButton();
	    this.isRed = false;

	    if (this.__newmsgsatstart != 0)
	    {
		this.__newmsgsatstart = 0;
		this.__srpc.callAsync(this.sendresult,
				      "SEEN", global_ids + this.winid);
	    }
	},

	updateButton : function()
	{
	    var name = this.getName();
	    
	    if (this.__type == 0 && this.__nw_id == 0)
	    {
		name = name.substr(1);
		name = name.substr(0, 1).toUpperCase() + name.substr(1);
	    }
	    
	    this.taskbarButton.setLabel("<font color=\"#" + this.__taskbarButtonColor + "\">" + name +
					(this.hidden == true ?
					 " <font color=\"#ccaacc\">M</font>" : "<span style=\"visibility:hidden;\"> M</span>") + "</font>");	    
	},

	handleMove : function(e)
	{
	    var data = e.getData();
	    var x = data.left;
	    var y = data.top;

	    if (MainScreenObj.initdone == 1)
	    {

		this.__srpc.callAsync(this.sendresult,
				      "MOVE", global_ids + this.winid + " " +
				      x + " " + y);
	    }
	},

	handleMinimize : function(e)
	{
	    this.hidden = true;
	    this.updateButton();

	    if (MainScreenObj.initdone == 1)
	    {
		this.__srpc.callAsync(this.sendresult,
				      "HIDE", global_ids + this.winid);	    
	    }
	},


	handleRestore : function(e)
	{
	    this.hidden = false;
	    this.updateButton();

	    if (MainScreenObj.initdone == 1)
	    {
		this.__srpc.callAsync(this.sendresult,
				      "REST", global_ids + this.winid);	    
	    }
	},

	activatewin : function()
	{
	    if (this.__settingsmode == 0)
	    {
		this.__input1.focus();
	    }
	},

	sendresult : function(result, exc) 
	{
	    if (exc == null) 
	    {
		var pos = result.search(/ /);
		var command = result.slice(0, pos);
		
		if (command == "OPERLIST")
		{
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
		else
		{
		    //call "superclass"
		    MainScreenObj.sendresult(result, exc);
		}
	    }
	    else 
	    {
		infoDialog.showInfoWin("Lost connection to server.<p>Trying to recover...");
		//TODO: Add delay ~2s here
		window.location.reload(true);
	    }
	},

	addHandlers : function()
	{
	    this.window.addListener('resize', this.handleResize, this);
	    this.window.addListener('move', this.handleMove, this);
	    this.window.addListener('minimize', this.handleMinimize, this);
	    this.window.addListener('appear', this.handleRestore, this);

	    this.window.addListener('click', function(e) {

		if (this.taskbarControl)
		{
		    this.taskbarControl.setSelection([this.taskbarButton]);
		}
		//this.activatewin();
		MainScreenObj.activewin = this.winid;
	    }, this);

	    this.window.addListener("close", this.handleClose, this);

	    var closeok = 0;

	    this.window.addListener("beforeClose", function(e) {
		var mywindow = this.window;

		if (closeok == 0)
		{
		    e.preventDefault();

		    infoDialog.showInfoWin("Are you sure?<p>You need to close windows only when you<br>wish to permanently stop following the discussion", "Yes", function() {
			closeok = 1;
			mywindow.close();
		    }, "NO");
		}
	    }, this);
	},

	moveTo : function(x,y)
	{
	    this.window.moveTo(x, y);
	},

	show : function()
	{
	    this.window.open();
	    this.hidden = false;
	    this.updateButton();
    	},

	hide : function()
	{
	    this.window.minimize();
	    this.hidden = true;
	    this.updateButton();
    	},

	getName : function()
	{
	    return this.__name;
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

	    this.__atom.setValue(this.__channelText);

	    if (this.scrollLock == false)
	    {
		this.__scroll.scrollToY(100000);
	    }
	},

	changetopic : function(line)
	{
	    var nw = "(" + this.__nw + " channel) ";
	    var cname = this.__name;

	    this.__topic = line;

	    if(line == "")
	    {
		line = "Topic not set.";
	    }

	    if (this.__nw_id == 0 && this.__type == 0)
	    {
		cname = cname.substr(1, 1).toUpperCase() + cname.substr(2);
		nw = "Group: ";
	    }
	    else if (this.__nw_id == 0 && this.__type == 1)
	    {
		nw = "";
	    }

	    if (this.__type == 0)
	    {
		this.window.setCaption(nw + cname + " : " + line);
	    }
	    else
	    {
		this.window.setCaption(nw + "*** Private conversation with " + cname);
	    }
	},

	addnames : function(firstround)
	{
	    if (this.__type == 0)
	    {
		if (firstround == true)
		{
		    this.__list.removeAll();
		}

		var amount = this.nameslist.length;

		if (this.nameslist.length > 3)
		{
		    amount = 3;
		}

		for (var i=0; i < amount; i++)
		{
		    var display = this.nameslist[i];
		    var realnick;

		    if(display.charAt(0) == "*")
		    {
			display = "<b>" + display.substr(1) + "</b>"; 
			realnick = "@" + this.nameslist[i].substr(1);
		    }
		    else
		    {
			realnick = this.nameslist[i];
		    }

		    var tmp = new qx.ui.form.ListItem(display).set(
			{ rich : true });
		    tmp.realnick = realnick;

		    this.__list.add(tmp);
		}

		this.nameslist.splice(0, amount);

		if (this.nameslist.length > 0)
		{
		    qx.event.Timer.once(function(e){
			this.addnames(false);
		    }, this, 1000); 
		}
	    }
	},

	addname : function(nick)
	{
	    var insert = -1;

	    if (this.__type == 0)
	    {
		var childs = this.__list.getChildren();

		for (var i=0; i < childs.length; i++)
		{
		    var listnick = childs[i].realnick;
		    var newnick = nick;

		    //trick to sort @ before +
		    if (listnick.charAt(0) == "@")
			listnick = "*" + listnick.substr(1);

		    if (newnick.charAt(0) == "@")
			newnick = "*" + newnick.substr(1);

		    if (newnick.toLowerCase() < listnick.toLowerCase())
		    {
			insert = i;
			break;
		    }
		}

		if (insert == -1 && this.nameslist.length == 0)
		{
		    insert = childs.length;
		}

		if (insert != -1)
		{
		    //place found
		    var display = nick;

		    if(nick.charAt(0) == "@")
		    {
			display = "<b>" + nick.substr(1) + "</b>"; 
		    }

		    var tmp = new qx.ui.form.ListItem(display).set(
			{ rich : true });
		    tmp.realnick = nick;

		    this.__list.addAt(tmp, insert);
		}
		else
		{
		    //List construction is still ongoing
		    for (var i=0; i < this.nameslist.length; i++)
		    {
			if (nick.toLowerCase() < this.nameslist[i].toLowerCase())
			{
			    insert = i;
			    break;
			}
		    }
		    
		    if (insert == -1)
		    {
			insert = this.nameslist.length;
		    }

		    this.nameslist.splice(insert, 0, nick);
		}
	    }
	},

	delname : function(nick)
	{
	    var found = false;

	    if (this.__type == 0)
	    {
		var childs = this.__list.getChildren();
		
		for (var i=0; i < childs.length; i++)
		{
		    var nickname = childs[i].realnick;

		    if(nickname.charAt(0) == "@" || nickname.charAt(0) == "+")
		    {
			nickname = nickname.substr(1);
		    }

		    if(nickname == nick)
		    {
			found = true;
			this.__list.remove(childs[i]);
		    }
		}

		if (!found)
		{
		    for (var i=0; i < this.nameslist.length; i++)
		    {
			var nickname = this.nameslist[i];

			if(nickname.charAt(0) == "@" || nickname.charAt(0) == "+")
			{
			    nickname = nickname.substr(1);
			}

			if (nickname == nick)
			{
			    this.nameslist.splice(i, 1);
			}
		    }
		}
	    }
	},

	getList : function()
	{
	    var list = new qx.ui.form.List;
	    list.setFocusable(false);
	    list.setContextMenu(this.getContextMenu());

	    list.add(new qx.ui.form.ListItem("Wait..."));
	    list.setAllowGrowY(true);
	    this.__list = list;

	    return list;
	},

	getContextMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var chatButton = new qx.ui.menu.Button("Start private chat with");

	    chatButton.addListener("execute", function(e) {
		// huh!
		var name = this.getLayoutParent().getOpener().getSelection()[0].realnick;
		
		var userwindow = 
		    this.getLayoutParent().getOpener().getLayoutParent().getLayoutParent().getLayoutParent().userWindowRef;

		userwindow.__srpc.callAsync(userwindow.sendresult,
					    "STARTCHAT", global_ids + userwindow.__nw + " " + name);
	    });

	    menu.add(chatButton);

	    if (this.__nw_id != 0)
	    {

		var whoisButton = new qx.ui.menu.Button("Whois");

		whoisButton.addListener("execute", function(e) {
		    var name = this.getLayoutParent().getOpener().getSelection()[0].realnick;
		    var userwindow = 
			this.getLayoutParent().getOpener().getLayoutParent().getLayoutParent().getLayoutParent().userWindowRef;
		    
		    userwindow.__srpc.callAsync(userwindow.sendresult,
						"WHOIS", global_ids + 
						userwindow.winid + " " + name);
		});

		menu.add(whoisButton);
	    }

	    if (this.__usermode != 0 || this.__nw_id != 0)
	    {

		var kickButton = new qx.ui.menu.Button("Kick");

		kickButton.addListener("execute", function(e) {
		    var name = this.getLayoutParent().getOpener().getSelection()[0].realnick;
		    var userwindow = 
			this.getLayoutParent().getOpener().getLayoutParent().getLayoutParent().getLayoutParent().userWindowRef;
		    
		    userwindow.__srpc.callAsync(userwindow.sendresult,
						"KICK", global_ids + 
						userwindow.winid + " " + name);
		});

		menu.add(kickButton);
		
		var banButton = new qx.ui.menu.Button("Kick and ban");
		
		banButton.addListener("execute", function(e) {
		    var name = this.getLayoutParent().getOpener().getSelection()[0].realnick;
		    var userwindow = 
			this.getLayoutParent().getOpener().getLayoutParent().getLayoutParent().getLayoutParent().userWindowRef;
		    
		    userwindow.__srpc.callAsync(userwindow.sendresult,
						"BAN", global_ids +  
						userwindow.winid + " " + name);
		});

		menu.add(banButton);
	    }

	    if (this.__nw_id != 0 || this.__usermode == 2)
	    {
		var opButton = new qx.ui.menu.Button("Give operator rights");

		opButton.addListener("execute", function(e) {
		    var name = this.getLayoutParent().getOpener().getSelection()[0].realnick;
		    var userwindow = 
			this.getLayoutParent().getOpener().getLayoutParent().getLayoutParent().getLayoutParent().userWindowRef;
		    
		    userwindow.__srpc.callAsync(userwindow.sendresult,
						"OP", global_ids +  
						userwindow.winid + " " + name);
		});

		menu.add(opButton);
	    }

	    return menu;
	},

	getSettingsView : function()
	{
	    var composite = new qx.ui.container.Composite(
		new qx.ui.layout.Grid(12,12));

	    //TOPIC

	    if (this.__type == 0)
	    {
		var ltitle = new qx.ui.basic.Label("Topic:");
		composite.add(ltitle, {row:0, column: 0})
	    }

	    var scomposite1 = new qx.ui.container.Composite(
		new qx.ui.layout.HBox(10));
	    
	    this.topicInput = new qx.ui.form.TextField();
	    this.topicInput.set({ maxLength: 200 });
	    this.topicInput.setWidth(250);
	    scomposite1.add(this.topicInput);

	    var button1 = new qx.ui.form.Button("Change");
	    if (this.__nw_id != 0 || this.__usermode != 2)
	    {
		button1.setEnabled(false);
	    }

	    scomposite1.add(button1);

	    button1.addListener("execute", function (e) {
		this.__srpc.callAsync(
		    this.sendresult,
		    "TOPIC", global_ids +
			this.winid + " " +
			this.topicInput.getValue());		
	    }, this);

	    if (this.__type == 0)
	    {
	    	composite.add(scomposite1, {row: 0, column: 1});
	    }

	    //SOUNDS

            var lsounds = new qx.ui.basic.Label("Audible alert:");
	    composite.add(lsounds, {row:1, column: 0})

	    var scomposite2 = new qx.ui.container.Composite(
		new qx.ui.layout.HBox(10));
	    
	    var syes = new qx.ui.form.RadioButton("On (play sound when new msg arrives)");
	    var sno = new qx.ui.form.RadioButton("Off");

	    if (this.sound == 0)
	    {
		sno.setValue(true);
	    }
	    else
	    {
		syes.setValue(true);
	    }

	    syes.addListener("click", function(e) {
		this.sound = 1;
		
		this.__srpc.callAsync(
		    this.sendresult,
		    "SOUND", global_ids +
			this.winid + " " + 1);
	    }, this);

	    sno.addListener("click", function(e) {
		this.sound = 0;
		
		this.__srpc.callAsync(
		    this.sendresult,
		    "SOUND", global_ids + this.winid + " " + 0);
	    }, this);

	    var rmanager = new qx.ui.form.RadioGroup(syes, sno);

	    scomposite2.add(syes);
	    scomposite2.add(sno);

	    composite.add(scomposite2, {row:1, column: 1})

	    //TITLE ALERT

            var ltitles = new qx.ui.basic.Label("Visual alert:");
	    composite.add(ltitles, {row:2, column: 0})

	    var scomposite4 = new qx.ui.container.Composite(
		new qx.ui.layout.HBox(10));
	    
	    var tyes = new qx.ui.form.RadioButton("On (make browser title bar blink when new msg arrives)");
	    var tno = new qx.ui.form.RadioButton("Off");

	    if (this.titlealert == 0)
	    {
		tno.setValue(true);
	    }
	    else
	    {
		tyes.setValue(true);
	    }

	    tyes.addListener("click", function(e) {
		this.titlealert = 1;
		
		this.__srpc.callAsync(
		    this.sendresult,
		    "TITLEALERT", global_ids + this.winid + " " + 1);
	    }, this);

	    tno.addListener("click", function(e) {
		this.titlealert = 0;
		
		this.__srpc.callAsync(
		    this.sendresult,
		    "TITLEALERT", global_ids + this.winid + " " + 0);
	    }, this);

	    var rmanager2 = new qx.ui.form.RadioGroup(tyes, tno);

	    scomposite4.add(tyes);
	    scomposite4.add(tno);

	    composite.add(scomposite4, {row:2, column: 1})

	    //PASSWORD

	    if (this.__type == 0)
	    {
		composite.add(new qx.ui.basic.Label("Password:"), {row:3, column: 0})
	    }

	    var scomposite3 = new qx.ui.container.Composite(
		new qx.ui.layout.HBox(10));
	    
	    this.pwInput = new qx.ui.form.TextField();
	    this.pwInput.set({ maxLength: 20 });
	    this.pwInput.setWidth(250);
	    this.pwInput.setPlaceholder("<not set>");
	    
	    scomposite3.add(this.pwInput);
	    
	    var button2 = new qx.ui.form.Button("Change");
	    scomposite3.add(button2);
	    
	    if (this.__nw_id != 0 || this.__usermode != 2)
	    {
		button2.setEnabled(false);
	    }

	    button2.addListener("execute", function (e) {
		this.__srpc.callAsync(
		    this.sendresult,
		    "PW", global_ids +
			this.winid + " " +
			this.pwInput.getValue());		
	    }, this);

	    if (this.__type == 0)
	    {
		composite.add(scomposite3, {row: 3, column: 1});
	    }

	    //Group URL:

	    if (this.__type == 0 && this.__nw_id == 0)
	    {
		composite.add(new qx.ui.basic.Label("Participation link:"), {row:4, column: 0});
	    }
	    
	    var link = new qx.ui.form.TextField();
	    link.set({ maxLength: 200 });
	    link.setWidth(250);
	    link.setValue("http://meetandspeak.com/join/" + this.__name.substr(1));

	    if (this.__type == 0 && this.__nw_id == 0)
	    {
		composite.add(link, {row: 4, column: 1});
	    }

	    //OPER LIST

	    if (this.__usermode == 2)
	    {
		composite.add(new qx.ui.basic.Label("Operators:"), {row:5, column: 0})
	    }

	    var scroll1 = new qx.ui.container.Scroll();
	    this.configListOper = new qx.ui.form.List;
	    this.configListOper.set({ height: 120, selectionMode : "single" });
	    scroll1.add(this.configListOper);
	    scroll1.set({
		scrollbarX : "auto",
		scrollbarY : "auto"
	    });

	    if (this.__usermode == 2)
	    {
		composite.add(scroll1, {row: 5, column: 1});
	    	var buttonOper = new qx.ui.form.Button("Remove rights");
		buttonOper.setAllowStretchY(false);
		composite.add(buttonOper, {row: 5, column: 2});

		buttonOper.addListener("execute", function(e) {
		    var userid = this.configListOper.getSelection()[0].userid;

		    this.__srpc.callAsync(qx.lang.Function.bind(this.sendresult, this),
					  "DEOP", global_ids + this.winid + " " + userid);
		}, this);
	    }

	    //BAN LIST

	    if (this.__usermode != 0)
	    {
		composite.add(new qx.ui.basic.Label("Ban list:"), {row:6, column: 0})
	    }

	    var scroll2 = new qx.ui.container.Scroll();
	    this.configListBan = new qx.ui.form.List;
	    this.configListBan.setAllowGrowX(true);
	    this.configListBan.set({ height: 120, minWidth: 900, width: 1000, selectionMode : "single" });
	    scroll2.add(this.configListBan);
	    scroll2.set({
		scrollbarX : "auto",
		scrollbarY : "auto",
		marginBottom : 15
	    });

	    if (this.__usermode != 0)
	    {
		composite.add(scroll2, {row: 6, column: 1});
	    	var buttonBan = new qx.ui.form.Button("Unban");
		buttonBan.setAllowStretchY(false);
		composite.add(buttonBan, {row: 6, column: 2});

		buttonBan.addListener("execute", function(e) {
		    var banid = this.configListBan.getSelection()[0].banid;

		    this.__srpc.callAsync(qx.lang.Function.bind(this.sendresult, this),
					  "UNBAN", global_ids + this.winid + " " + banid);
		}, this);
	    }

	    return composite;
	}
    }
});
