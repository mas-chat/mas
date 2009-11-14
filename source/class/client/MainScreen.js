/* ************************************************************************
5B5B
#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.MainScreen",
{
    extend : qx.core.Object,

    construct : function()
    {
	this.base(arguments);

	// read "socket"
	this.__rrpc = new qx.io.remote.Rpc(
	    ralph_url + "/",
	    "ralph"
	);
	this.__rrpc.setTimeout(20000);

        this.__timer = new qx.event.Timer(1000 * 60);
        this.__timer.start();
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
	seq : 0,
	windows : [],
	desktop : 0,

	readresult : function(result, exc) 
	{
	    if (exc == null) 
	    {
		var pos = result.search(/ /);
		var command = result.slice(0, pos);
		var param = result.slice(pos+1);

		pos = param.search(/ /);
		var window_id = param.slice(0, pos);

		if (command === "CREATE")
		{
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
		    var topic = options.join(" ");

		    var newWindow = 
			new client.UserWindow(MainScreenObj.desktop,
					      topic, nw, name, type, nw_id);

		    newWindow.moveTo(x, y);

                    newWindow.setHeight(height);
                    newWindow.setWidth(width);

		    newWindow.show();

		    newWindow.addHandlers();
		    newWindow.winid = window_id;
		    MainScreenObj.windows[window_id] = newWindow;

		    MainScreenObj.updateWindowButtons();
		}
		else if (command === "ADDTEXT")
		{
		    var usertext = param.slice(pos+1);
                    MainScreenObj.windows[window_id].addline(usertext);
		}   
		else if (command === "TOPIC")
		{
		    var usertext = param.slice(pos+1);
                    MainScreenObj.windows[window_id].changetopic(usertext);
		}   
		else if (command === "NAMES")
		{
		    var usertext = param.slice(pos+1);
                    MainScreenObj.windows[window_id].addnames(usertext);
		}
		else if (command === "NICK")
		{
		    global_nick = param.split(" ");
		}
		else if (command === "DIE")
		{
		    var reason = param.slice(pos+1);
		    alert("Session expired. Press OK to return login page. " + reason);
		    window.location = ralph_domain + "/?logout=yes";
		}
		else if (command === "CLOSE")
		{
		    var winid = param.slice(pos+1);
		    //TODO: call destructor?
		    delete MainScreenObj.windows[winid];

		    MainScreenObj.updateWindowButtons();		    
		}
	        else if (command === "FLIST")
                {
 	            MainScreenObj.updateFriendsList(globalflist, param);
                }
	    } 
	    else 
	    {
//		alert("Exception during async call: " + exc);
	    }

	    MainScreenObj.seq++;
              
	    if (command !== "DIE")
	    {
		//TODO: can cause havoc towards server when looping
		MainScreenObj.__rrpc.callAsync(MainScreenObj.readresult,
				      "HELLO", global_id + " " + global_sec + " " + MainScreenObj.seq);
	    }
	},

	show : function(rootItem)
	{
	    this.__myapp = rootItem;
	    MainScreenObj = this;

	    /* Layout for root */
	    var rootLayout = new qx.ui.layout.VBox(1);

	    /* Root widget */
	    var rootContainer = new qx.ui.container.Composite(rootLayout);
	    rootContainer.add(this.getMenuBar());
	    
	    /* middle */
	    var windowManager = new qx.ui.window.Manager();
	    this.__manager = windowManager;

	    var middleSection = new qx.ui.container.Composite(new qx.ui.layout.HBox(2));

	    var middleContainer = new qx.ui.window.Desktop(windowManager);
//	    middleContainer.setAllowGrowX(false);
//	    middleContainer.setAllowGrowY(false);

	    this.desktop = middleContainer;

	    middleContainer.set({decorator: "main", backgroundColor: "background-pane"});

	    middleSection.add(middleContainer, {flex:1});

	    var friendContainer = new qx.ui.container.Composite(new qx.ui.layout.Grid());
	    
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

	    var showLabel = new qx.ui.basic.Label("<font color=\"blue\">S<br>H<br>O<br>W<br><br>F<br>R<br>I<br>E<br>N<br>D<br>S</font>");
	    showLabel.setRich(true);
	    
	    showLabel.addListener("click", function(e) {
		this.remove(showLabel);
	        this.add(friendContainer);
		
	    }, middleSection);
	    
	    
	    hideLabel.addListener("click", function(e) {
		this.remove(friendContainer);
		
	        this.add(showLabel);
		
	    }, middleSection);
            
            friendContainer.add(hideLabel, {column:1, row:0});
	    	    
	    globalflist = new qx.ui.container.Composite(new qx.ui.layout.VBox());
	    
	    globalflist.setAllowGrowY(true);
	    // globalflist.set({backgroundColor: "background-pane"});
	    
            this.__timer.addListener(
		"interval", function(e) { this.updateIdleTimes(globalflist); }, this);
	    
	    friendContainer.add(globalflist, {row: 1, column: 0, colSpan:2});
	    
	    middleSection.add(friendContainer);
	    
	    rootContainer.add(middleSection, {flex:1});		
	    
	    // create the toolbar
	    toolbar = new qx.ui.toolbar.ToolBar();
	    toolbar.set({ maxHeight : 40 });
	    
	    // create and add Part 1 to the toolbar
	    this.__part2 = new qx.ui.toolbar.Part();
	    this.__part3 = new qx.ui.toolbar.Part();
	    
	    toolbar.add(this.__part2);
	    toolbar.addSpacer();
	    
	    this.__input = new qx.ui.form.TextField("Search (keywords or date (DD.MM.YY))").set({
		maxLength: 150 , width: 250});
	    
	    this.__part3.add(this.__input);
	    toolbar.add(this.__part3);

	    this.updateWindowButtons();

	    rootContainer.add(toolbar);//, {left:"3%",bottom:"3%", right:"3%", width:"20%" });
	    rootItem.add(rootContainer, {edge : 10});	    

	    this.__rrpc.callAsync(this.readresult, "HELLO", global_id + " " + global_sec + " " + this.seq);
	},

	updateFriendsList : function(parentFList, allFriends)
        {
	    parentFList.removeAll();
	    
	    var myfriends = allFriends.split("||");
	    
	    for (var i=0; i < myfriends.length; i++)	
	    {
	        var columns = myfriends[i].split("|");
		
                var friend = new qx.ui.basic.Label("<b>" + columns[1] + "</b> (" + columns[0] + ")");
		
                var friend2 = new qx.ui.basic.Label();
                friend2.setRich(true);
                friend.setRich(true);
		
		friend.setPaddingTop(7);
		friend2.setPaddingTop(0);
		friend2.setPaddingLeft(20);
		friend.setPaddingLeft(10);
	        friend2.idleTime = columns[3]; 
		
                parentFList.add(friend);
                parentFList.add(friend2);
            }
	    
	    this.printIdleTimes(parentFList);
        }, 

        printIdleTimes : function(parentFList)
        {
            var children = parentFList.getChildren();
	    
            for (var i=1; i < children.length; i = i + 2)
            {
	        var idle = children[i].idleTime;
                var result;
		
		if (idle == 0)
                {
		    result = "<font color=\"green\">ONLINE<font>";
                }
                else if (idle < 60)
                {			
                    result = "<font color=\"blue\">Last: " + idle + " minutes ago<font>";
                }
		else if (idle < 60 * 24)
                {  
	            idle = Math.round(idle / 60);
		    if (idle == 0)
		    {
			idle = 1;
		    }

                    result = "<font color=\"blue\">Last: " + idle + " hours ago<font>";
                }
		else if (idle < 5000000)
                {  
	            idle = Math.round(idle / 60 / 24);
		    if (idle == 0)
		    {
			idle = 1;
		    }

                    result = "<font color=\"blue\">Last: " + idle + " days ago<font>";
                }
		else
		{
		    result = "<font color=\"blue\">Last: Unknown<font>";
		}
		
		children[i].setValue(result);
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
	    var mythis = MainScreenObj;

	    mythis.__part2.removeAll();
	    mythis._disposeObjects("__windowgroup");
	    mythis.__windowGroup = new qx.ui.form.RadioGroup();

	    for (var i=0; i < mythis.windows.length; i++)
	    {
		if (mythis.windows[i])
		{
		    var item = new qx.ui.toolbar.RadioButton(mythis.windows[i].getName());
		    mythis.__part2.add(item)
		    mythis.__windowGroup.add(item);
		}
	    }

	    mythis.__windowGroup.addListener("changeSelection", mythis.switchToWindow, mythis);

	},

	switchToWindow : function(e)
	{
	    var mythis = MainScreenObj;

	    for (var i=0; i < mythis.windows.length; i++)
	    {
		if (e.getData()[0] == mythis.__part2.getChildren()[i]) 
		{
		    mythis.windows[i].show();
		}
	    }
	},

	getMenuBar : function()
	{
	    var frame = new qx.ui.container.Composite(new qx.ui.layout.Grow);

	    var menubar = new qx.ui.menubar.MenuBar;
	    menubar.setAllowGrowX(true);

	    frame.add(menubar);

	    var forumMenu = new qx.ui.menubar.Button("Forums", null, this.getForumMenu());
	    var advancedMenu = new qx.ui.menubar.Button("Advanced", null, this.getAdvancedMenu());
	    var helpMenu = new qx.ui.menubar.Button("Help", null, this.getHelpMenu());
	    var logoutMenu = new qx.ui.menubar.Button("Log Out", null, this.getLogoutMenu());

	    menubar.add(forumMenu);
	    menubar.add(advancedMenu);
	    menubar.add(helpMenu);
	    menubar.add(logoutMenu);

	    return frame;
	},

	getLogoutMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var logoutButton = new qx.ui.menu.Button("Log out", "icon/16/actions/edit-undo.png");
	    menu.add(logoutButton);

	    logoutButton.addListener("execute", this._logoutCommand);

	    return menu;
	},

	getHelpMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var manualButton = new qx.ui.menu.Button("Manual");
	    var aboutButton = new qx.ui.menu.Button("About...");

	    manualButton.addListener("execute", this._manualCommand);
	    aboutButton.addListener("execute", this._aboutCommand);

	    menu.add(manualButton);
	    menu.addSeparator();
	    menu.add(aboutButton);

	    return menu;
	},

	getForumMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var createButton = new qx.ui.menu.Button("Create new forum...");
	    var joinButton = new qx.ui.menu.Button("Join to existing forum...");

	    createButton.addListener("execute", this._createForumCommand, this);
	    joinButton.addListener("execute", this._joinForumCommand, this);

	    menu.add(createButton);
	    menu.add(joinButton);

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

	_joinForumCommand : function(app)
	{
	    infoDialog.getJoinNewChannelWin(this.__myapp, 0);
	},

	_createForumCommand : function()
	{
	    alert("tbd3");
	},

	_logoutCommand : function()
	{
	    qx.bom.Cookie.del("ProjectEvergreen");
	    window.location = ralph_domain + "/?logout=yes";
	},

	_manualCommand : function()
	{
	    alert("manual: ask ilkka");
	},

	_aboutCommand : function()
	{
	    alert("Evergreen moe: ver 0.3");
	}
    }
});

