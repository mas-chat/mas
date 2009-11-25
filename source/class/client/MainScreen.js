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
	this.__rrpc = new qx.io.remote.Rpc(
	    ralph_url + "/",
	    "ralph"
	);
	this.__rrpc.setTimeout(30000);

        this.__timer = new qx.event.Timer(1000 * 60);
        this.__timer.start();

        this.__topictimer = new qx.event.Timer(1000);

	this.__topictimer.addListener(
	    "interval", function(e) {
		if (this.__topicstate == 0)
		{
		    document.title = "[NEW] Evergreen";
		    this.__topicstate = 1;
		}
		else
		{
		    document.title = "[MSG] Evergreen";
		    this.__topicstate = 0;
		}
	    }, this);

	this.__tt = new qx.ui.tooltip.ToolTip("Send Message");
	this.__myapp = rootItem;
	
	this.__rrpc.callAsync(
	    qx.lang.Function.bind(this.readresult, this), "HELLO",
	    global_id + " " + global_sec + " " + this.seq);

	qx.bom.Element.addListener(window, "focus", function(e) { 
	    this.__blur = 0;
	    this.__topictimer.stop();
	    document.title = "Evergreen";
	}, this);

	qx.bom.Element.addListener(window, "blur", function(e) { 
	    this.__blur = 1;
	}, this);

	FlashHelper =
	    {
		movieIsLoaded : function (theMovie)
		{
		    if (typeof(theMovie) != "undefined") return theMovie.PercentLoaded() == 100;
		    else return
		    false;
		},

		getMovie : function (movieName)
		{
		    if (navigator.appName.indexOf ("Microsoft") !=-1) return window[movieName];
		    else return document[movieName];
		}
	    };
    },

    members :
    {
        __rrpc : 0,
	__part2 : 0,
	__part3 : 0,
	__windowGroup : 0,
	__manager : 0,
	__myapp : 0,
        __timer : 0,
        __topictimer : 0,
	__topicstate : 0,
	__ack : 0,
	__tt : 0,
	__blur : 0,
	__newmsgs : 0,
	seq : 0,
	windows : [],
	desktop : 0,

	sendresult : function(result, exc) 
	{
	    
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
				"(got: " + ack + ", expected: " + this.__ack,
			    false);
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

		    switch(command)
		    {
			
		    case "CREATE":
			var options = param.split(" ");
		    
			options.shift(); // window id
			var x = parseInt(options.shift());
			var y = parseInt(options.shift());
			var width = parseInt(options.shift());
			var height = parseInt(options.shift());
			var nw = options.shift();
			var nw_id = options.shift();
			var name = options.shift();
			var type = parseInt(options.shift());
			var sound = parseInt(options.shift());
			var topic = options.join(" ");

			var newWindow = 
			    new client.UserWindow(this.desktop,
						  topic, nw, name, type, sound, nw_id);

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
			
			newWindow.show();
			
			newWindow.addHandlers();
			newWindow.winid = window_id;
			this.windows[window_id] = newWindow;

			this.updateWindowButtons();
			break;

		    case "ADDTEXT":
			var usertext = param.slice(pos+1);
			this.windows[window_id].addline(usertext);

			if (this.windows[window_id].sound == 1)
			{
			    this.player_start();
			}

			if (this.__blur == 1)
			{
			    this.__topictimer.start();
			} 
			break;
   
		    case "TOPIC":
		    	var usertext = param.slice(pos+1);
			this.windows[window_id].changetopic(usertext);
			break;

		    case "NAMES":
		    	var usertext = param.slice(pos+1);
			this.windows[window_id].addnames(usertext);
			break;

		    case "NICK":
			global_nick = param.split(" ");
			break;
			
		    case "DIE":
		    	if (this.desktop === 0)
			{
			    this.show();
			}

			var reason = param.slice(pos+1);
			infoDialog.showInfoWin(
			    "Session expired. <p>Press OK to return login page.",
			    true,
			    function () {
				window.location = ralph_domain + "/?logout=yes";
			    });
			doitagain = false;
			break;

		    case "CLOSE":
			var winid = param.slice(pos+1);
			//TODO: call destructor?
			delete this.windows[winid];

			this.updateWindowButtons();		    
			break;

		    case "FLIST":
			this.updateFriendsList(globalflist, param);
			break;

		    case "SET":
			global_settings = new client.Settings(param);
			this.show();
			break;
		    }
		}

		if (doitagain == true)
		{
		    this.__rrpc.callAsync(
			qx.lang.Function.bind(this.readresult, this),
			"HELLO", global_id + " " + global_sec + " " +
			    this.seq);
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
			"HELLO", global_id + " " + global_sec + " " +
			    this.seq);
		}, this, 200); 
	    }	    
	},
	
	show : function()
	{
	    /* Layout for root */
	    var rootLayout = new qx.ui.layout.VBox(1);

	    /* Root widget */
	    var rootContainer = new qx.ui.container.Composite(rootLayout);
	    rootContainer.add(this.getMenuBar());
	    
	    /* middle */
	    var windowManager = new qx.ui.window.Manager();
	    this.__manager = windowManager;

	    var middleSection = new qx.ui.container.Composite(
		new qx.ui.layout.HBox(2));

	    var middleContainer = new qx.ui.window.Desktop(windowManager);

	    middleContainer.addListener("resize", this.checkLimits,this);

//	    middleContainer.setAllowGrowX(false);
//	    middleContainer.setAllowGrowY(false);

	    this.desktop = middleContainer;

	    middleContainer.set({decorator: "main",
				 backgroundColor: "background-pane"});

	    middleSection.add(middleContainer, {flex:1});

	    var friendContainer = new qx.ui.container.Composite(
		new qx.ui.layout.Grid());
	    
	    var friendsLabel = new qx.ui.basic.Label("<b>Friends:</b>");
            friendsLabel.setRich(true);
	    friendsLabel.setMinWidth(200);	
	    friendsLabel.setWidth(200);	
	    friendsLabel.setPaddingTop(10);
	    friendsLabel.setPaddingBottom(10);
	    friendsLabel.setPaddingLeft(10);
            
            friendContainer.add(friendsLabel, {column:0, row:0});

	    var hideLabel = new qx.ui.basic.Label("<font color=\"blue\">HIDE</font>");
            hideLabel.setRich(true);
	    hideLabel.setMinWidth(200);	
	    hideLabel.setPaddingTop(10);
	    hideLabel.setPaddingLeft(10);

	    var showLabel = new qx.ui.basic.Label(
		"<font color=\"blue\">S<br>H<br>O<br>W<br><br>F<br>R<br>" +
		    "I<br>E<br>N<br>D<br>S</font>");
	    showLabel.setRich(true);
	    
	    showLabel.addListener("click", function(e) {
		this.remove(showLabel);
	        this.add(friendContainer);
		global_settings.setShowFriendBar(1)
	    }, middleSection);
	    
	    hideLabel.addListener("click", function(e) {
		this.remove(friendContainer);
	        this.add(showLabel);
		global_settings.setShowFriendBar(0)
	    }, middleSection);
            
            friendContainer.add(hideLabel, {column:1, row:0});
	    	    
	    globalflist = new qx.ui.container.Composite(new qx.ui.layout.Grid());
	    globalflist.setAllowGrowY(true);
	    
	    friendContainer.add(globalflist, {row: 1, column: 0, colSpan:2});
	    
	    if (global_anon == false)
	    {
		if (global_settings.getShowFriendBar() == 1)
		{
		    middleSection.add(friendContainer);
		}
		else
		{
		    middleSection.add(showLabel);
		}

		this.__timer.addListener(
		    "interval", function(e) { this.updateIdleTimes(globalflist); },
		    this);
	    }

	    rootContainer.add(middleSection, {flex:1});		
	    
	    // create the toolbar
	    toolbar = new qx.ui.toolbar.ToolBar();
	    toolbar.set({ maxHeight : 40 });
	    
	    // create and add Part 1 to the toolbar
	    this.__part2 = new qx.ui.toolbar.Part();
	    this.__part3 = new qx.ui.toolbar.Part();
	    
	    toolbar.add(this.__part2);
	    toolbar.addSpacer();
	    
	    //this.__part3.add(this.__input);
	    
	    if (global_anon == false)
	    {
		toolbar.add(this.__part3);
	    }

	    this.updateWindowButtons();

	    rootContainer.add(toolbar);
	    this.__myapp.add(rootContainer, {edge : 10});	    
	},

	updateFriendsList : function(parentFList, allFriends)
        {
	    parentFList.removeAll();
	    
	    var myfriends = allFriends.split("||");
	    
	    for (var i=0; i < myfriends.length; i++)	
	    {
	        var columns = myfriends[i].split("|");
		
                var friend = new qx.ui.basic.Label("<b>" + columns[1] +
						   "</b> (" + columns[0] + ")");
                var friend2 = new qx.ui.basic.Label();
                
                var friend3 = new qx.ui.basic.Label();
		friend3.setRich(true);	
		friend3.setValue("<font color=\"green\">|M|</font>");
		friend3.nickname = columns[0];
		friend3.rrpc = this.__rrpc;

		friend3.addListener("click", function (e) {
		    this.rrpc.callAsync(
			this.sendresult,
			"STARTCHAT", global_id + " " + global_sec + " " +
			    "Evergreen " + this.nickname);
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
	        friend2.idleTime = columns[3]; 
		
                parentFList.add(friend, {row: 2*i, column: 0});
                parentFList.add(friend2, {row: 2*i+1, column: 0, colSpan : 2});
                parentFList.add(friend3, {row: 2*i, column: 1});
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
		    result = "<font color=\"blue\">Last: Unknown</font>";
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
	
	updateWindowButtons : function()
	{
	    this.__part2.removeAll();
	    this._disposeObjects("__windowgroup");
	    this.__windowGroup = new qx.ui.form.RadioGroup();

	    for (var i=0; i < this.windows.length; i++)
	    {
		if (this.windows[i])
		{
		    var item = new qx.ui.toolbar.RadioButton(
			this.windows[i].getName());
		    this.__part2.add(item)
		    this.__windowGroup.add(item);
		}
	    }

	    this.__windowGroup.addListener("changeSelection",
					   this.switchToWindow, this);

	},

	switchToWindow : function(e)
	{
	    for (var i=0; i < this.windows.length; i++)
	    {
		if (e.getData()[0] == this.__part2.getChildren()[i]) 
		{
		    this.windows[i].show();
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
	    var advancedMenu = new qx.ui.menubar.Button("Advanced", null,
							this.getAdvancedMenu());
	    var helpMenu = new qx.ui.menubar.Button("Help", null, this.getHelpMenu());
	    var logoutMenu = new qx.ui.menubar.Button("Log Out", null,
						      this.getLogoutMenu());

	    if (global_anon == false)
	    {
		menubar.add(forumMenu);
		menubar.add(viewMenu);
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

	    var prefButton = new qx.ui.menu.Button("Preferences...");
	    var logsButton = new qx.ui.menu.Button("Log history...");

	    prefButton.addListener("execute", this._prefCommand, this);
	    logsButton.addListener("execute", this._logsCommand, this);

	    menu.add(prefButton);
	    menu.add(logsButton);

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
	    logDialog.show(this.__myapp);
	},

	_prefCommand : function(app)
	{
	    alert("coming soon");
	},

	_joinForumCommand : function(app)
	{
	    infoDialog.getJoinNewChannelWin(this.__myapp, 0);
	},

	_createForumCommand : function()
	{
	    infoDialog.getCreateNewGroupWin(this.__myapp, 0);
	},

	_logoutCommand : function()
	{
	    qx.bom.Cookie.del("ProjectEvergreen");
	    window.location = ralph_domain + "/?logout=yes";
	},

	_manualCommand : function()
	{
	    this.niftyplayer('niftyPlayer1').play();
	    alert("manual: ask ilkka");
	},

	_aboutCommand : function()
	{
	    alert("Evergreen moe: ver 0.3");
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

