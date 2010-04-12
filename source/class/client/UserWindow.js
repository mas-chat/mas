/* ************************************************************************

#asset(projectx/*)
5B5B#require(qx.util.StringSplit)

************************************************************************ */

qx.Class.define("client.UserWindow",
{
    extend : qx.core.Object,

    construct : function(srpc, desktop, topic, nw, name, type, sound, titlealert,
			 nw_id, usermode, password, new_msgs, infoDialog, mainscreen)
    {
	this.base(arguments);
	this.__urllist = new Array();
	this.nameslist = new Array();
	this.rpc = srpc;
	this.mainscreen = mainscreen;
	this.infoDialog = infoDialog;

	var layout = new qx.ui.layout.Grid();
	layout.setRowFlex(0, 1); // make row 0 flexible
	layout.setColumnFlex(0, 1); // make column 0 flexible
	layout.setColumnWidth(1, 100); // set with of column 1 to 200 pixel
	layout.setColumnAlign(1, "center", "middle");

	var wm1 = new qx.ui.window.Window();
	wm1.userWindowRef = this;
	wm1.setAppearance("aie-mtsk-window");

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
	wm1.setResizeSensitivity(10);
	wm1.set({contentPadding: [0,0,0,0]});

	this.__box1 = new qx.ui.container.Composite(layout);
	this.__box1.set({backgroundColor: "#F2F5FE", padding:10, margin: 0});
	wm1.add(this.__box1, {flex:1});

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
	this.__box1.add(this.__scroll, {row: 0, column: 0, flex: 1});
	
	this.__input1 = new qx.ui.form.TextField();
	this.__input1.set({ maxLength: 400 });
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
		    this.rpc.call("SEND", this.winid + " " + input, this);

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
			this.mainscreen.nicks[this.__nw_id] + "&gt;</b> ";

		    if (input.substr(0,4) == "/me ")
		    {
			input = input.substr(4);
			mynick = " <font color=\"blue\"><b>* " +
			    this.mainscreen.nicks[this.__nw_id] + "</b> ";
		    }
		    
		    if (input.substr(0,1) != "/")
		    {
			this.addline(hour + ":" + min + mynick + input + "</font><br><!-- x -->");
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
		this.mainscreen.activateNextWin("down");
	    }
	    else if (e.getKeyIdentifier() == "Up")
	    {
		this.mainscreen.activateNextWin("up");
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

	this.__box1.add(icomposite, {row: 1, column: 0});

	this.prefButton = new qx.ui.form.ToggleButton("Settings");
	this.urlButton = new qx.ui.form.ToggleButton("L");

	this.prefButton.setFocusable(false);
	this.urlButton.setFocusable(false);

	this.prefButton.setMargin(2,5,2,5);
	this.urlButton.setMargin(2,5,2,5);

	var buttons = new qx.ui.container.Composite(
	    new qx.ui.layout.HBox(0));

	buttons.add(this.prefButton);
	buttons.add(this.urlButton);

	if (type == 0)
	{
	    this.__box1.add(this.getList(), {row: 0, column: 1, flex:1});
	    this.__box1.add(buttons, {row: 1, column: 1});
	}
	else
	{
	    icomposite.add(buttons);
	}

	this.window = wm1;
	this.__type = type;
	this.__name = name;
	this.__settings = this.getSettingsView();		    
	this.__urls = this.getUrlsView();

	this.prefButton.addListener("changeValue", function(e) {
	    if (e.getData() == true)
	    {
		this.urlButton.setEnabled(false);

		this.topicInput.setValue(this.__topic);
		this.pwInput.setValue(this.__password);

		if (this.__usermode == 2)
		{
		    this.configListOper.removeAll();
		    this.configListOper.add(new qx.ui.form.ListItem("Refreshing..."));
		    
		    this.rpc.call("GETOPERS", this.winid, this);
		}

		if (this.__usermode != 0)
		{
		    this.configListBan.removeAll();
		    this.configListBan.add(new qx.ui.form.ListItem("Refreshing..."));

		    this.rpc.call("GETBANS", this.winid, this);
		}

		this.__box1.remove(this.__scroll);
		if (this.__type == 0)
		{
		    this.__box1.remove(this.__list);
		    this.__box1.add(this.__settings, {row : 0, column : 0, colSpan : 2 });
		}
		else
		{
		    this.__box1.add(this.__settings, {row : 0, column : 0});
		}

		this.__viewmode = 1;
	    }
	    else
	    {
		this.getBackFromSettingsMode();
	    }
	}, this);

	this.urlButton.addListener("changeValue", function(e) {
	    if (e.getData() == true)
	    {
		this.prefButton.setEnabled(false);
		this.updateUrls();

		this.__box1.remove(this.__scroll);
		if (this.__type == 0)
		{
		    this.__box1.remove(this.__list);
		    this.__box1.add(this.__urls, {row : 0, column : 0, colSpan : 2 });
		}
		else
		{
		    this.__box1.add(this.__urls, {row : 0, column : 0 });
		}

		this.__viewmode = 2;
	    }
	    else
	    {
		this.getBackFromUrlMode();
	    }
	}, this);

	desktop.add(wm1);

	this.changetopic(topic);
    },

    //TODO: write proper destructor
    members :
    {
        window : 0,
	hidden : false,
	winid : 0,
	rpc : 0,
	taskbarControl : 0,
	titlealert : 0,
	sound : 0,
	configListBan : 0,
	configListOper : 0,
	nameslist : null,
	closeok : 0,
	scrollLock : false,
	isRed : false,
	infoDialog : 0,
	mainscreen : 0,

	__input1 : 0,
	__urllabel : 0,
	__list : 0,
	__atom : 0,
	__channelText : "",
	__scroll : 0,
	__lines : 0,
	__settings : 0,
	__urls : 0,
	__viewmode : 0,
	__box1 : 0,
	__nw : 0,
	__nw_id : 0,
	__type : 0,
	__topic : 0,
	__taskbarButtonColor : "cccccc",
	__name : 0,
	__password : 0,
	__usermode : 0,
	__newmsgsatstart : 0,
	__urllist : null,

	updateValues : function(topic, nw, name, type, sound, titlealert,
				nw_id, usermode, password)
	{
	    this.__password = password;
	    this.__usermode = usermode;
	    this.__topic = topic;

	    if (this.__viewmode == 1)
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

	    if (this.mainscreen.initdone == 1)
	    {
		this.rpc.call("RESIZE", this.winid + " " + width + " " + height,
			     this);
	    }
	},

	handleClose : function(e)
	{
	    this.rpc.call("CLOSE", this.winid, this);
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
		this.rpc.call("SEEN", this.winid, this);
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

	    if (this.mainscreen.initdone == 1)
	    {
		this.rpc.call("MOVE", this.winid + " " + x + " " + y, this);
	    }
	},

	handleMinimize : function(e)
	{
	    this.hidden = true;
	    this.updateButton();

	    if (this.mainscreen.initdone == 1)
	    {
		this.rpc.call("HIDE", this.winid, this);
	    }
	},

	handleRestore : function(e)
	{
	    this.hidden = false;
	    this.updateButton();

	    if (this.mainscreen.initdone == 1)
	    {
		this.rpc.call("REST", this.winid, this);
	    }
	},

	activatewin : function()
	{
	    if (this.__viewmode == 0)
	    {
		this.__input1.focus();
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
		this.mainscreen.activewin = this.winid;
		this.setNormal();
	    }, this);

	    this.window.addListener("close", this.handleClose, this);

	    var closeok = 0;

	    this.window.addListener("beforeClose", function(e) {
		var mywindow = this.window;
		
		if (this.__viewmode == 1)
		{
		    e.preventDefault();
		    this.prefButton.setValue(false);
		}
		else if (this.__viewmode == 2)
		{
		    e.preventDefault();
		    this.urlButton.setValue(false);
		}
		else if (closeok == 0 && this.__list.hasChildren() == true)
		{
		    e.preventDefault();

		    this.infoDialog.showInfoWin(
			"Are you sure?<p>You need to close windows only when " +
			    "you<br>wish to permanently stop following the discussion", "Yes",
			function() 
			{
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

	expandMOTD : function()
	{
	    this.__channelText = this.__channelText.replace(/(<!--|-->|Click here to see details and MOTD\.)/g, "");

	    this.addline("");
	},

	addline : function(line)
	{
	    this.__channelText = this.__channelText + line;

	    this.__lines++;

	    // limit lines
	    if (this.__lines > 200)
	    {
		var pos = this.__channelText.search(/<\!-- x -->/i)
		this.__channelText = this.__channelText.substr(pos + 11);
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
		    {
			listnick = "*" + listnick.substr(1);
		    }

		    if (newnick.charAt(0) == "@")
		    {
			newnick = "*" + newnick.substr(1);
		    }

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

	getBackFromSettingsMode : function()
	{
	    this.prefButton.setLabel("Settings");
	    this.__box1.remove(this.__settings);
	    this.__box1.add(this.__scroll, { row:0, column :0});

	    if (this.__type == 0)
	    {
		this.__box1.add(this.__list, { row:0, column :1});
	    }

	    this.__viewmode = 0;
	    this.urlButton.setEnabled(true);
	},

	getBackFromUrlMode : function()
	{
	    this.__box1.remove(this.__urls);
	    
	    this.__box1.add(this.__scroll, { row:0, column :0});
	    if (this.__type == 0)
	    {
		this.__box1.add(this.__list, { row:0, column :1});
	    }
	    
	    this.__viewmode = 0;
	    this.prefButton.setEnabled(true);
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

		
		userwindow.rpc.call("STARTCHAT", userwindow.__nw + " " + name,
				    userwindow);
	    });

	    menu.add(chatButton);

	    if (this.__nw_id != 0)
	    {

		var whoisButton = new qx.ui.menu.Button("Whois");

		whoisButton.addListener("execute", function(e) {
		    var name = this.getLayoutParent().getOpener().getSelection()[0].realnick;
		    var userwindow = 
			this.getLayoutParent().getOpener().getLayoutParent().getLayoutParent().getLayoutParent().userWindowRef;
		    
		    userwindow.rpc.call("WHOIS", userwindow.winid + " " + name,
				       userwindow);
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
		    
		    userwindow.rpc.call("KICK", userwindow.winid + " " + name,
					userwindow);
		});

		menu.add(kickButton);
		
		var banButton = new qx.ui.menu.Button("Kick and ban");
		
		banButton.addListener("execute", function(e) {
		    var name = this.getLayoutParent().getOpener().getSelection()[0].realnick;
		    var userwindow = 
			this.getLayoutParent().getOpener().getLayoutParent().getLayoutParent().getLayoutParent().userWindowRef;
		    
		    userwindow.rpc.call("BAN", userwindow.winid + " " + name,
				       userwindow);
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
		    
		    userwindow.rpc.call("OP", userwindow.winid + " " + name,
				       userwindow);
		});

		menu.add(opButton);
	    }

	    return menu;
	},

	getUrlsView : function()
	{
	    var scroll = new qx.ui.container.Scroll();
	    
	    scroll.set({
		scrollbarY : "auto"
	    });

	    this.__urllabel = new qx.ui.basic.Label("");
	    this.__urllabel.setRich(true);
	    this.__urllabel.setAllowGrowX(true);
	    this.__urllabel.setAllowGrowY(true);
	    this.__urllabel.setAlignY("top");
		
	    scroll.add(this.__urllabel);

	    return scroll;
	},

	updateUrls : function()
	{
	    var text = "<b>Link Catcher</b><p>";

	    if (this.mainscreen.anon_user == true)
	    {
		text = text + 
		    "(If you register, links are not lost when you log out.)<p>"; 
	    }

	    if (this.__urllist.length == 0)
	    {
		text = text + 
		  "<br><br><br><center>No links detected yet in conversation.<br><br>" + 
		    "Press the U-button again to return normal view.</center>";
	    }
	    else
	    {
		text = text + "<ul>";

		for (var i=0; i < this.__urllist.length; i++) 
		{
		    text = text + "<li><a target=\"_blank\" href=\"" +
			this.__urllist[i] + "\">" +
			this.__urllist[i] + "</a><br></li>";
		}

		text = text + "</ul>";
	    }
	    this.__urllabel.setValue(text);
	},

	addUrl : function(url)
	{
	    this.__urllist.push(url);
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
		this.rpc.call("TOPIC", this.winid + " " + this.topicInput.getValue(),
			     this);
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
	    var smanager = new qx.ui.form.RadioGroup(syes, sno);

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
		
		this.rpc.call("SOUND", this.winid + " " + 1, this);
	    }, this);

	    sno.addListener("click", function(e) {
		this.sound = 0;

		this.rpc.call("SOUND", this.winid + " " + 0, this);
	    }, this);

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
	    var tmanager = new qx.ui.form.RadioGroup(tyes, tno);

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
		
		this.rpc.call("TITLEALERT", this.winid + " " + 1, this);
	    }, this);

	    tno.addListener("click", function(e) {
		this.titlealert = 0;
		
		this.rpc.call("TITLEALERT", this.winid + " " + 0, this);
	    }, this);

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
		this.rpc.call("PW", this.winid + " " + this.pwInput.getValue(),
			     this);
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
	    this.configListOper.set({ maxHeight: 90, selectionMode : "single" });
	    scroll1.add(this.configListOper);
	    scroll1.set({
		scrollbarX : "auto",
		scrollbarY : "auto", maxHeight: 90
	    });

	    if (this.__usermode == 2)
	    {
		composite.add(scroll1, {row: 5, column: 1});
	    	var buttonOper = new qx.ui.form.Button("Remove rights");
		buttonOper.setAllowStretchY(false);
		composite.add(buttonOper, {row: 5, column: 2});

		buttonOper.addListener("execute", function(e) {
		    var userid = this.configListOper.getSelection()[0].userid;

		    this.rpc.call("DEOP", this.winid + " " + userid, this);
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
	    this.configListBan.set({ maxHeight: 90, minWidth: 900, width: 1000, selectionMode : "single" });
	    scroll2.add(this.configListBan);
	    scroll2.set({
		scrollbarX : "auto",
		scrollbarY : "auto",
		marginBottom : 15,
		maxHeight: 90
	    });

	    if (this.__usermode != 0)
	    {
		composite.add(scroll2, {row: 6, column: 1});
	    	var buttonBan = new qx.ui.form.Button("Unban");
		buttonBan.setAllowStretchY(false);
		composite.add(buttonBan, {row: 6, column: 2});

		buttonBan.addListener("execute", function(e) {
		    var banid = this.configListBan.getSelection()[0].banid;
		    
		    this.rpc.call("UNBAN", this.winid + " " + banid, this);
		}, this);
	    }

	    return composite;
	}
    }
});
