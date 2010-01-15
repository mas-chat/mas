/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.MainScreen",
{
    extend : qx.core.Object,

    construct : function(rootItem)
    {
	this.base(arguments);

	// read "socket"
	this.__rrpc = new qx.io.remote.Rpc("/ralph", "ralph");
	this.__rrpc.setTimeout(30000);

	//global because of call from LogDialog, not optimal
	var d = new Date();
	global_offset = d.getTimezoneOffset();

        this.__timer = new qx.event.Timer(1000 * 60);
        this.__timer.start();

        this.__topictimer = new qx.event.Timer(1000);

	this.__topictimer.addListener(
	    "interval", function(e) {
		if (this.__topicstate == 0)
		{
		    document.title = "[NEW] MeetAndSpeak";
		    this.__topicstate = 1;
		}
		else
		{
		    document.title = "[MSG] MeetAndSpeak";
		    this.__topicstate = 0;
		}
	    }, this);

	this.__tt = new qx.ui.tooltip.ToolTip("Send Message");
	this.__myapp = rootItem;
	
	this.__rrpc.callAsync(
	    qx.lang.Function.bind(this.readresult, this), "HELLO",
	    global_ids + this.seq);

	qx.bom.Element.addListener(window, "focus", function(e) { 
	    document.title = "MeetAndSpeak";
	    this.__blur = 0;
	    this.__topictimer.stop();

	    if (this.windows[this.activewin])
	    {
		this.windows[this.activewin].activatewin();
	    }
	}, this);

	qx.bom.Element.addListener(window, "blur", function(e) { 
	    this.__blur = 1;
	}, this);

	FlashHelper =
	    {
		movieIsLoaded : function (theMovie)
		{
		    if (typeof(theMovie) != "undefined" && typeof(theMovie.PercentLoaded) == "function")
		    {
			return theMovie.PercentLoaded() == 100;
		    }
		    else 
		    {
			return false;
		    }
		},

		getMovie : function (movieName)
		{
		    if (navigator.appName.indexOf ("Microsoft") !=-1)
		    {
			return window[movieName];
		    }
		    else
		    {
			return document[movieName];
		    }
		}
	    };
    },

    members :
    {
        __rrpc : 0,
	__part2 : 0,
	__part3 : 0,
	__windowGroup : 0,
	manager : 0,
	__myapp : 0,
        __timer : 0,
        __topictimer : 0,
	__topicstate : 0,
	__ack : 0,
	__tt : 0,
	__blur : 0,
	__newmsgs : 0,
	activewin : 0,
	__msgvisible : 0,
	initdone : 0,
	rootContainer : 0,
	seq : 0,
	windows : [],
	desktop : 0,

	sendresult : function(result, exc) 
	{
	    if (exc == null) 
	    {
		//Remove num of commands, should be always 1 to this case
		//TODO: Common parts with readresult() should investigated
		
		//TODO: BIG HACK -> fix the protocol!!!
		if (result.charAt(0) == "1")
		{
		    result = result.substr(2);
		}

                var pos = result.search(/ /);
                var command = result.slice(0, pos);
                var param = result.slice(pos+1);
                
		switch(command)
		{
		    
		case "DIE" :
		    infoDialog.showInfoWin("Session terminated. <p>Press OK to restart.",
					   "OK", function () {
					       qx.bom.Cookie.del("ProjectEvergreen");
					       window.location.reload(true);
					   });
		    break;
		    
		case "OK" :
		    break;

		case "INFO" :
		    infoDialog.showInfoWin(param, "OK");
		    break;
		}
	    }
	    else 
	    {
		infoDialog.showInfoWin("Lost connection to server.<p>Trying to recover...");
		//TODO: Add delay ~2s here
		window.location.reload(true);
	    }
	},

	readresult : function(result, exc) 
	{
	    var doitagain = true;

	    this.seq++;

	    if (exc == null) 
	    {
		var initialpos = result.search(/ /);
		var ack = result.slice(0, initialpos);
		var allcommands = result.slice(initialpos+1);

		if (ack == 1)
		{
		    this.__ack = 1;
		}
		else
		{
		    this.__ack++;
		    if (this.__ack != ack)
		    {
			if (this.desktop === 0)
			{
			    this.show();
			}

			infoDialog.showInfoWin(
			    "Lost connection to server.<p>Trying to recover...<p>" +
				"(got: " + ack + ", expected: " + this.__ack);
			window.location.reload(true);
		    }
		}

		var commands = allcommands.split("<>");

		for (var i=0; i < commands.length; i++)
		{
		    var pos = commands[i].search(/ /);
		    var command = commands[i].slice(0, pos);
		    var param = commands[i].slice(pos+1);

		    pos = param.search(/ /);
		    var window_id = param.slice(0, pos);

		    //alert ("handling:" + command + param);

		    switch(command)
		    {

		    case "COOKIE":
			var options = param.split(" ");
			global_tmpcookie = options.shift();
			global_ids = global_id + " " + global_sec + " " + global_tmpcookie + " ";
			break;

		    case "CREATE":
			var options = param.split(" ");
			this.create_or_update_window(options, true);
			break;

		    case "UPDATE":
			var options = param.split(" ");
			this.create_or_update_window(options, false);
			break;

		    case "INITDONE":
			this.initdone = 1;
			var group = qx.bom.Cookie.get("ProjectEvergreenJoin");
			var that = this;
			if (group != null)
			{
			    var data = group.split("-");

			    qx.bom.Cookie.del("ProjectEvergreenJoin");
			    infoDialog.showInfoWin("Do you want to join to group " + data[0] + "?", "Yes", 
						   function()
						   {
						       that.__rrpc.callAsync(
							   qx.lang.Function.bind(that.sendresult, that), "JOIN",
							   global_ids + data[0] + " Evergreen " + data[1]);
						   }, "NO");
			}
			
			break;

		    case "ADDTEXT":
			var usertext = param.slice(pos+1);

			usertext = this.adjustTime(usertext);
			this.windows[window_id].addline(usertext);

			if (this.windows[window_id].sound == 1)
			{
			    this.player_start();
			}

			if (this.__blur == 1 && this.windows[window_id].titlealert == 1 && this.__topictimer.getEnabled() == false)
			{
			    this.__topictimer.start();
			} 

			if (this.activewin.winid != window_id && this.initdone == 1)
			{
			    this.windows[window_id].setRed();
			}

			break;

		    case "REQF":
			var options = param.split(" ");
		    	var friend_id = parseInt(options.shift());
			var friend_nick = options.shift();
			var friend_name = options.join(" ");

			if (this.__msgvisible == false)
			{
			    this.msg = new qx.ui.container.Composite(
				new qx.ui.layout.HBox(8));
			    this.msg.setPadding(5, 15, 5, 15);
			    this.msg.set({ backgroundColor: "yellow"});

			    this.msg.add(new qx.ui.basic.Label(
				friend_name + " (" + friend_nick + ") wants to be your friend. Is this OK?"));

			    var accept = new qx.ui.basic.Label("<font color=\"blue\">ACCEPT</font>");
			    var decline = new qx.ui.basic.Label("<font color=\"blue\">DECLINE</font>");
			    accept.setRich(true);
			    decline.setRich(true);

			    accept.addListener("click", function () {
				this.__rrpc.callAsync(
				    qx.lang.Function.bind(this.sendresult, this),
				    "OKF", global_ids +	friend_id);
				//TODO: this relies on proper carbage collection
				this.rootContainer.remove(this.msg);
				this.__msgvisible = false;
			    }, this);

			    decline.addListener("click", function () {
				this.__rrpc.callAsync(
				    qx.lang.Function.bind(this.sendresult, this),
				    "NOKF", global_ids + friend_id);
				//TODO: this relies on proper carbage collection
				this.rootContainer.remove(this.msg);
				this.__msgvisible = false;
			    }, this);

			    this.msg.add(accept);
			    this.msg.add(decline);
			    
			    this.__msgvisible = true;

			    this.rootContainer.addAt(this.msg, 1, {flex:0});
			}
			// else ignore command

			break;
   
		    case "TOPIC":
		    	var usertext = param.slice(pos+1);
			this.windows[window_id].changetopic(usertext);
			break;

		    case "NAMES":
		    	var usertext = param.slice(pos+1);
			this.windows[window_id].nameslist = usertext.split(" ");
			this.windows[window_id].addnames(true);
			break;

		    case "ADDNAME":
			var options = param.split(" ");
		    	var windowid = parseInt(options.shift());
		    	var index = parseInt(options.shift());
		    	var nick = options.shift();
			this.windows[windowid].addname(index, nick);
			break;

		    case "DELNAME":
		    	var usertext = param.slice(pos+1);
			this.windows[window_id].delname(usertext);
			break;

		    case "NICK":
			global_nick = param.split(" ");
			break;

		    case "DIE":
		    	if (this.desktop === 0)
			{
			    this.show();
			}
			infoDialog.showInfoWin(
			    "Protocol Error. <p>Press OK to relogin.",
			    "OK", 
			    function () {
				qx.bom.Cookie.del("ProjectEvergreen");
				window.location.reload(true);
			    });
			doitagain = false;
			break;
						
		    case "EXPIRE":
		    	if (this.desktop === 0)
			{
			    this.show();
			}

			var reason = param.slice(pos+1);
			infoDialog.showInfoWin(
			    "Session expired. You logged in from another location or<br>server was restarted.<p>Press OK to restart.",
			    "OK", 
			    function () {
				window.location.reload(true);
			    });
			doitagain = false;
			break;

		    case "OK" :
			break;

		    case "INFO" :
			infoDialog.showInfoWin(param, "OK");
			break;

		    case "CLOSE":
			var window_id = param.slice(pos+1);
			this.removeWindowButton(window_id);			
			//TODO: call destructor?
			delete this.windows[window_id];
			break;

		    case "FLIST":
			this.updateFriendsList(globalflist, param);
			break;

		    case "SET":
			global_settings = new client.Settings(param);
			//We have settings now, ready to draw main screen
			this.show();
			break;
		    }
		}

		if (doitagain == true)
		{
		    this.__rrpc.callAsync(
			qx.lang.Function.bind(this.readresult, this),
			"HELLO", global_ids + this.seq);
		}
	    }
	    else 
	    {
		//Wait a little and try again. This is to make sure
		//that we don't loop and consume all CPU cycles if
		//there is no connection.
		qx.event.Timer.once(function(e){
		    this.__rrpc.callAsync(
			qx.lang.Function.bind(this.readresult, this),
			"HELLO", global_ids + this.seq);
		}, this, 200); 
	    }
	},

	create_or_update_window : function(options, create)
	{
	    var window_id = options.shift();
	    var x = parseInt(options.shift());
	    var y = parseInt(options.shift());
	    var width = parseInt(options.shift());
	    var height = parseInt(options.shift());
	    var nw = options.shift();
	    var nw_id = options.shift();
	    var name = options.shift();
	    var type = parseInt(options.shift());
	    var sound = parseInt(options.shift());
	    var titlealert = parseInt(options.shift());
	    var usermode = parseInt(options.shift());
	    var pwset = parseInt(options.shift());

	    var password = "";

	    if (pwset == 1)
	    {
		password = options.shift();
	    }
	    
	    var topic = options.join(" ");

	    if (create == true)
	    {
		var newWindow = 
		    new client.UserWindow(this.desktop,
					  topic, nw, name, type, sound, titlealert,
					  nw_id, usermode, password);
		
		if (x < 0)
		{
		    x = 0;
		}
		
		if (y < 0)
		{
		    y = 0;
		}
		
		var dim = this.desktop.getBounds();
		
		if (dim && x + width > dim.width)
		{
		    if (width < dim.width)
		    {
			x = dim.width - width;
		    }
		    else
		    {
			x = 5;
			width = dim.width - 10;
		    }
		}
		
		if (dim && y + height > dim.height)
		{
		    if (height < dim.height)
		    {
			y = dim.height - height;
		    }
		    else
		    {
			y = 5;
			height = dim.height - 10;
		    }
		}

		newWindow.moveTo(x, y);	
		newWindow.setHeight(height);
		newWindow.setWidth(width);

		newWindow.winid = window_id;
		this.windows[window_id] = newWindow;

		this.addWindowButton(window_id);
			
		//Keep these two last
		newWindow.show();
		newWindow.addHandlers();
	    }
	    else
	    {
		if (this.windows[window_id])
		{
		    this.windows[window_id].updateValues(
			topic, nw, name, type, sound, titlealert,
			nw_id, usermode, password);
		}
	    }
	},

	adjustTime : function(text)
	{
	    var myRe = /<(\d+)>/g;
	    var myArray;

	    while ((myArray = myRe.exec(text)) != null)
	    {
		var mytime = parseInt(myArray[1]) - global_offset;
		if (mytime < 0)
		{
		    mytime = 1440 + mytime;
		}
		if (mytime > 1440)
		{
		    mytime = mytime - 1440;
		}

		var hour = Math.floor(mytime / 60);
		var min = mytime % 60;
		
		if (min < 10)
		{
		    min = "0" + min;
		}
		
		if (hour < 10)
		{
		    hour = "0" + hour;
		}

		text = text.replace(/<\d+>/, hour + ":" + min);
	    }
	    
	    return text;
	},
	
	show : function()
	{
	    /* Root widget */
	    this.rootContainer = new qx.ui.container.Composite(
		new qx.ui.layout.VBox(1));
	    this.rootContainer.add(this.getMenuBar());
	    
	    /* middle */
	    var windowManager = new qx.ui.window.Manager();
	    this.manager = windowManager;

	    var middleSection = new qx.ui.container.Composite(
		new qx.ui.layout.HBox(2));

	    var middleContainer = new qx.ui.window.Desktop(windowManager);

	    middleContainer.addListener("resize", this.checkLimits,this);

	    this.desktop = middleContainer;

	    middleContainer.set({decorator: "main",
				 backgroundColor: "#DFE5E5"});

	    middleSection.add(middleContainer, {flex:1});

	    var friendContainer = new qx.ui.container.Composite(
		new qx.ui.layout.VBox());
	    
	    var friendsLabel = new qx.ui.basic.Label("<b>Contact list:</b>");
            friendsLabel.setRich(true);
	    friendsLabel.setMinWidth(200);	
	    friendsLabel.setWidth(200);	
	    friendsLabel.setPaddingTop(10);
	    friendsLabel.setPaddingBottom(10);
	    friendsLabel.setPaddingLeft(10);
            
            friendContainer.add(friendsLabel);
	    	    
	    globalflist = new qx.ui.container.Composite(new qx.ui.layout.Grid());
	    globalflist.setAllowGrowY(true);
	    
	    friendContainer.add(globalflist, {flex: 1});

	    var addContainer = new qx.ui.container.Composite(
		new qx.ui.layout.HBox());

	    this.__input1 = new qx.ui.form.TextField();
	    this.__input1.setPlaceholder("<nick name>");
	    this.__input1.setMarginBottom(8);
	    this.__input1.setMarginLeft(8);

	    addContainer.add(this.__input1, {flex: 1});
	    addContainer.add(new qx.ui.core.Spacer(8));

	    var button1 = new qx.ui.form.Button("Add");
	    button1.setMarginBottom(8);
	    addContainer.add(button1);

	    friendContainer.add(addContainer);

	    button1.addListener("execute", function (e) {
		this.__rrpc.callAsync(
		    this.sendresult,
		    "ADDF", global_ids + this.__input1.getValue());		
	    }, this);

	    this.rootContainer.add(middleSection, {flex:1});		
	    
	    // create the toolbar
	    toolbar = new qx.ui.toolbar.ToolBar();
	    toolbar.set({ maxHeight : 40 });
	    
	    // create and add Part 1 to the toolbar
	    this.__part2 = new qx.ui.toolbar.Part();
	    this.__part3 = new qx.ui.toolbar.Part();
	    
	    toolbar.add(this.__part2);
	    toolbar.addSpacer();

	    if (global_anon == false)
	    {
		var contactsButton = new qx.ui.toolbar.CheckBox("Show Contacts");
		this.__part3.add(contactsButton);	
    
		if (global_settings.getShowFriendBar() == 1)
		{
		    middleSection.add(friendContainer);
		    contactsButton.setValue(true);
		}
		else
		{
		    contactsButton.setValue(false);
		}

		contactsButton.addListener("changeValue", function (e) {
		    if (e.getData() == true)
		    {
			this.add(friendContainer);
			global_settings.setShowFriendBar(1)
		    }
		    else
		    {
			this.remove(friendContainer);
			global_settings.setShowFriendBar(0)
		    } 
		}, middleSection);
		
		this.__timer.addListener(
		    "interval", function(e) { this.updateIdleTimes(globalflist); },
		    this);
	    
	    	toolbar.add(this.__part3);
	    }

	    this.rootContainer.add(toolbar);
	    this.__myapp.add(this.rootContainer, {edge : 10});	    

	    this.__windowGroup = new qx.ui.form.RadioGroup();
	    this.__windowGroup.addListener("changeSelection",
					   this.switchToWindow, this);

	},

	updateFriendsList : function(parentFList, allFriends)
        {
	    parentFList.removeAll();
	    
	    var myfriends = allFriends.split("||");
	    
	    if (allFriends != "")
	    {
		for (var i=0; i < myfriends.length; i++)	
		{
	            var columns = myfriends[i].split("|");
		    
                    var friend = new qx.ui.basic.Label("<b>" + columns[1] +
						       "</b> (" + columns[3] + ")");
                    var friend2 = new qx.ui.basic.Label();
                    
                    var friend3 = new qx.ui.basic.Label();
		    friend3.setRich(true);	
		    friend3.setValue("<font color=\"green\">|M|</font>");
		    friend3.nickname = columns[3];
		    friend3.rrpc = this.__rrpc;
		    
		    friend3.addListener("click", function (e) {
			this.rrpc.callAsync(
			    this.sendresult,
			    "STARTCHAT", global_ids + "Evergreen " + this.nickname);
		    }, friend3);
		    
		    friend3.addListener("mouseover", function (e) {
			this.setValue("<font color=\"green\"><b>|M|<b></font>");
		    }, friend3);
		    
		    friend3.addListener("mouseout", function (e) {
		    this.setValue("<font color=\"green\">|M|</font>");
		    }, friend3);

		    friend3.setToolTip(this.__tt);
		    
                    friend2.setRich(true);
                    friend.setRich(true);
		    
		    friend.setPaddingTop(7);
		    friend3.setPaddingTop(7);

		    friend2.setPaddingTop(0);
		    friend2.setPaddingLeft(20);
		    friend3.setPaddingLeft(10);
		    friend.setPaddingLeft(10);
	            friend2.idleTime = columns[0]; 
		
                    parentFList.add(friend, {row: 2*i, column: 0});
                    parentFList.add(friend2, {row: 2*i+1, column: 0, colSpan : 2});
                    parentFList.add(friend3, {row: 2*i, column: 1});
		}
	    }
	    else
	    {
		var nofriends = new qx.ui.basic.Label("No friends added<p>You can add new contacts by<br> using the field below<br>or by right-clicking <br>a name in any group window<p>You can send messages <br>and see status information<br> of your friends");
		nofriends.setRich(true);

		nofriends.setPaddingLeft(10);
		parentFList.add(nofriends, {row: 0, column: 0});
	    }

	    this.printIdleTimes(parentFList);
        }, 

        printIdleTimes : function(parentFList)
        {
            var children = parentFList.getChildren();
	    
            for (var i=1; i < children.length; i = i + 3)
            {
	        var idle = children[i].idleTime;
                var result;
		
		if (idle == 0)
                {
		    result = "<font color=\"green\">ONLINE<font>";
                }
                else if (idle < 60)
                {			
                    result = "<font color=\"blue\">Last: " + idle +
			" minutes ago</font>";
                }
		else if (idle < 60 * 24)
                {  
	            idle = Math.round(idle / 60);
		    if (idle == 0)
		    {
			idle = 1;
		    }

                    result = "<font color=\"blue\">Last: " + idle +
			" hours ago</font>";
                }
		else if (idle < 5000000)
                {  
	            idle = Math.round(idle / 60 / 24);
		    if (idle == 0)
		    {
			idle = 1;
		    }

                    result = "<font color=\"blue\">Last: " + idle +
			" days ago</font>";
                }
		else
		{
		    result = "<font color=\"blue\">Last:</font> Unknown";
		}
		
		children[i].setValue(result);
            }	

        },

	checkLimits : function(e)
	{
	    for (var i=0; i < this.windows.length; i++)
            {
		if (typeof(this.windows[i]) != 'undefined')
		{
		    var wbounds = this.windows[i].getBounds();
		    var dim = e.getData();
		    var x = wbounds.left;
		    var y = wbounds.top;
		    var width = wbounds.width;
		    var height = wbounds.height;
		    
		    if (x + width > dim.width)
		    {
			if (width < dim.width)
			{
			    x = dim.width - width;
			}
			else
			{
			    x = 5;
			    width = dim.width - 10;
			}
		    }
		    
		    if (y + height > dim.height)
		    {
			if (height < dim.height)
			{
			    y = dim.height - height;
			}
			else
			{
			    y = 5;
			    height = dim.height - 10;
			}
		    }

		    if (x != wbounds.left || y != wbounds.top)
		    {
			this.windows[i].moveTo(x, y);
		    }

		    if (width != wbounds.width)
		    {
			this.windows[i].setWidth(width);
		    }
		    
		    if  (height != wbounds.height)
		    {
			this.windows[i].setHeight(height);
		    }
		}
	    }	
	},
	    
        updateIdleTimes : function(parentFList)
        {
            var children = parentFList.getChildren();
	    
            for (var i=0; i < children.length; i++)
            {
		if (children[i].idleTime != 0)
		{
		    children[i].idleTime++;
		}
            }	

	    this.printIdleTimes(parentFList);
        },

	removeWindowButton : function(winid)
	{
	    if (this.windows[winid])
	    {
		this.__windowGroup.remove(this.windows[winid].taskbarControl);
		this.__part2.remove(this.windows[winid].taskbarButton);
	    }
	},

	addWindowButton : function(winid)
	{
	    if (this.windows[winid])
	    {
		var item = new qx.ui.toolbar.RadioButton();
		this.__part2.add(item);
		this.__windowGroup.add(item);
		item.setRich(true);
		// Link from window object to its taskbarbutton.
		this.windows[winid].taskbarButton = item;
		this.windows[winid].taskbarControl = this.__windowGroup;
		this.windows[winid].setNormal();
	    }

	    this.activewin = winid;
	    this.windows[winid].activatewin();
	},

	switchToWindow : function(e)
	{
	    for (var i=0; i < this.windows.length; i++)
	    {
		if (this.windows[i] && e.getData()[0] == this.windows[i].taskbarButton) 
		{
		    this.windows[i].show();
		    this.windows[i].setNormal();
		    this.activewin = i;
		    this.windows[i].activatewin();
		    break;
		}
	    }
	},

	getMenuBar : function()
	{
	    var frame = new qx.ui.container.Composite(new qx.ui.layout.Grow);

	    var menubar = new qx.ui.menubar.MenuBar;
	    menubar.setAllowGrowX(true);

	    frame.add(menubar);

	    var forumMenu = new qx.ui.menubar.Button("Groups", null,
						     this.getForumMenu());
	    var viewMenu = new qx.ui.menubar.Button("View", null,
						    this.getViewMenu());
	    var settingsMenu = new qx.ui.menubar.Button("Settings", null,
						    this.getSettingsMenu());
	    var advancedMenu = new qx.ui.menubar.Button("Advanced", null,
							this.getAdvancedMenu());
	    var helpMenu = new qx.ui.menubar.Button("Help", null, this.getHelpMenu());
	    var logoutMenu = new qx.ui.menubar.Button("Log Out", null,
						      this.getLogoutMenu());

	    if (global_anon == false)
	    {
		menubar.add(forumMenu);
		menubar.add(viewMenu);
		menubar.add(settingsMenu);
		menubar.add(advancedMenu);
	    }
	    menubar.add(helpMenu);
	    menubar.add(logoutMenu);

	    return frame;
	},

	getLogoutMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var logoutButton = new qx.ui.menu.Button("Log out",
						     "icon/16/actions/edit-undo.png");
	    menu.add(logoutButton);
	    logoutButton.addListener("execute", this._logoutCommand, this);

	    return menu;
	},

	getHelpMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var manualButton = new qx.ui.menu.Button("Manual");
	    var aboutButton = new qx.ui.menu.Button("About...");

	    manualButton.addListener("execute", this._manualCommand, this);
	    aboutButton.addListener("execute", this._aboutCommand, this);

	    menu.add(manualButton);
	    menu.addSeparator();
	    menu.add(aboutButton);

	    return menu;
	},

	getForumMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var createButton = new qx.ui.menu.Button("Create new group...");
	    var joinButton = new qx.ui.menu.Button("Join to existing group...");

	    createButton.addListener("execute", this._createForumCommand, this);
	    joinButton.addListener("execute", this._joinForumCommand, this);

	    menu.add(createButton);
	    menu.add(joinButton);

	    return menu;
	},

	getViewMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var logsButton = new qx.ui.menu.Button("Log history...");

	    logsButton.addListener("execute", this._logsCommand, this);

	    menu.add(logsButton);

	    return menu;
	},

	getSettingsMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var sslButton = new qx.ui.menu.CheckBox("Always use HTTPS");
	    
	    if (global_settings.getSslEnabled() == 1)
	    {
		sslButton.setValue(true);
	    }

	    sslButton.addListener("changeValue", this._sslCommand, this);
	    menu.add(sslButton);

	    return menu;
	},

	getAdvancedMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var joinButton = new qx.ui.menu.Button("Join to IRC channel...");

	    joinButton.addListener("execute", this._joinIRCCommand, this);
	    menu.add(joinButton);

	    return menu;
	},

	_joinIRCCommand : function(app)
	{
	    infoDialog.getJoinNewChannelWin(this.__myapp, 1);
	},

	_logsCommand : function(app)
	{
	    logDialog.show(this.__myapp, this.desktop.getBounds());
	},

	_joinForumCommand : function(app)
	{
	    infoDialog.getJoinNewChannelWin(this.__myapp, 0);
	},

	_createForumCommand : function()
	{
	    infoDialog.getCreateNewGroupWin(this.__myapp, 0);
	},

	_sslCommand : function(e)
	{
	    var usessl = e.getData();

	    if (usessl == true)
	    {
		global_settings.setSslEnabled(1);
		qx.bom.Cookie.set("UseSSL", "Yep", 100, "/");
	    }
	    else
	    {
		global_settings.setSslEnabled(0);
		qx.bom.Cookie.del("UseSSL");
	    }

	    infoDialog.showInfoWin("Application is now reloaded to activate<br> the change.", "OK", function() {
		window.location.reload(true);
	    });
	},

	_logoutCommand : function()
	{
	    qx.bom.Cookie.del("ProjectEvergreen");
	    window.location.reload(true);
	},

	_manualCommand : function()
	{
	    alert("manual: TBD");
	},

	_aboutCommand : function()
	{
	    alert("Evergreen: ver 0.4");
	},
	
	player_start : function()
	{
	    var obj = FlashHelper.getMovie('niftyPlayer1');
	    if (!FlashHelper.movieIsLoaded(obj)) return;
	    obj.TCallLabel('/','play');
	},

	player_stop : function()
	{
	    var obj = FlashHelper.getMovie(name);
	    if (!FlashHelper.movieIsLoaded(obj)) return;
	    obj.TCallLabel('/','stop');
	},

	player_pause : function()
	{
	    var obj = FlashHelper.getMovie(name);
	    if (!FlashHelper.movieIsLoaded(obj)) return;
	    obj.TCallLabel('/','pause');
	},

	player_pause : function()
	{
	    var obj = FlashHelper.getMovie(name);
	    if (!FlashHelper.movieIsLoaded(obj)) return;
	    obj.TCallLabel('/','reset');
	},
	
	player_load : function(url)
	{
	    var obj = FlashHelper.getMovie(name);
	    if (!FlashHelper.movieIsLoaded(obj)) return;
	    obj.SetVariable('currentSong', url);
	    obj.TCallLabel('/','load');
	},
	    
	player_get_state : function ()
	{
	    var obj = FlashHelper.getMovie(name);
	    var ps = obj.GetVariable('playingState');
	    var ls = obj.GetVariable('loadingState');
		
	    // returns
	    //   'empty' if no file is loaded
	    //   'loading' if file is loading
	    //   'playing' if user has pressed play AND file has loaded
	    //   'stopped' if not empty and file is stopped
	    //   'paused' if file is paused
	    //   'finished' if file has finished playing
	    //   'error' if an error occurred
	    if (ps == 'playing')
		if (ls == 'loaded') return ps;
	    else return ls;
	    
	    if (ps == 'stopped')
		if (ls == 'empty') return ls;
	    if (ls == 'error') return ls;
	    else return ps;
		
	    return ps;
		
	}
    }
});

