/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.MainScreen",
{
    extend : qx.core.Object,

    construct : function()
    {
	// read "socket"
	this.__rrpc = new qx.io.remote.Rpc(
	    ralph_domain + "/",
	    "ralph"
	);
	this.__rrpc.setTimeout(20000);

    },

    members :
    {
        __rrpc : 0,
	__part2 : 0,
	__windowGroup : 0,
	__manager : 0,
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
		var window = param.slice(0, pos);

		if (command === "CREATE")
		{
		    var system = false;
		    var options = param.split(" ");

		    if (window == 0)
		    {
			system = true;
		    }
		    
		    options.shift(); // window id
		    var x = parseInt(options.shift());
		    var y = parseInt(options.shift());
		    var width = parseInt(options.shift());
		    var height = parseInt(options.shift());

		    var name = options.join(" ");

		    var newWindow = new client.UserWindow(MainScreenObj.desktop, system, name);

		    newWindow.moveTo(x, y);

                    newWindow.setHeight(height);
                    newWindow.setWidth(width);

		    newWindow.show();

		    newWindow.addHandlers();
		    newWindow.winid = window;
		    MainScreenObj.windows[window] = newWindow;

		    MainScreenObj.updateWindowButtons();
		}
		else if (command === "ADDTEXT")
		{
		    var usertext = param.slice(pos+1);
                    MainScreenObj.windows[window].addline(usertext);
		}   
		else if (command === "TOPIC")
		{
		    var usertext = param.slice(pos+1);
                    MainScreenObj.windows[window].changetopic(usertext);
		}   
		else if (command === "NAMES")
		{
		    var usertext = param.slice(pos+1);
                    MainScreenObj.windows[window].addnames(usertext);
		}
		else if (command === "NICK")
		{
		    global_nick = param.slice(pos+1);
		}
		else if (command === "DIE")
		{
		    var reason = param.slice(pos+1);
		    alert("You logged in from a different computer. This session terminates. Reason: " + reason);
		    window.location="http://a167.myrootshell.com/";
		}
	    } 
	    else 
	    {
//		alert("Exception during async call: " + exc);
	    }

	    MainScreenObj.seq++;
              
	    if (command !== "DIE")
	    {
		MainScreenObj.__rrpc.callAsync(MainScreenObj.readresult,
				      "HELLO", global_id + " " + global_sec + " " + MainScreenObj.seq);
	    }
	},

	show : function(rootItem)
	{

	    MainScreenObj = this;

	    /* Layout for root */
	    var rootLayout = new qx.ui.layout.VBox(1);

	    /* Root widget */
	    var rootContainer = new qx.ui.container.Composite(rootLayout);

	    var bounds = rootContainer.getBounds();
	    rootContainer.add(this.getMenuBar(bounds));
	    
	    /* middle */
	    var windowManager = new qx.ui.window.Manager();
	    this.__manager = windowManager;
	    var middleContainer = new qx.ui.window.Desktop(windowManager);
	    this.desktop = middleContainer;

	    middleContainer.set({decorator: "main", backgroundColor: "background-pane"});
	    //middleContainer.setAllowGrowY(true);
	    rootContainer.add(middleContainer, {flex:1});
	    
	    // create the toolbar
	    toolbar = new qx.ui.toolbar.ToolBar();
	    toolbar.set({ maxHeight : 40 });

	    // create hidden join new channel window
	    this.wm4 = new client.NewChannelWindow(middleContainer);

	    // create and add Part 1 to the toolbar
	    var part1 = new qx.ui.toolbar.Part();
	    this.__part2 = new qx.ui.toolbar.Part();
	    
	    var joinButton = new qx.ui.toolbar.Button("Join new channel..", "icon/22/actions/document-new.png");
	    joinButton.addListener("execute", this.wm4.show, this.wm4);
	    part1.add(joinButton);

	    toolbar.add(part1);
	    toolbar.add(this.__part2);
	    this.updateWindowButtons();

	    rootContainer.add(toolbar);//, {left:"3%",bottom:"3%", right:"3%", width:"20%" });
	    rootItem.add(rootContainer, {edge : 10});	    

	    alert(global_id + " " + global_sec + " " + this.seq);

	    this.__rrpc.callAsync(this.readresult, "HELLO", global_id + " " + global_sec + " " + this.seq);
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

	getMenuBar : function(bounds)
	{
	    var frame = new qx.ui.container.Composite(new qx.ui.layout.Grow);

	    var menubar = new qx.ui.menubar.MenuBar;
	    menubar.setAllowGrowX(true);

	    frame.add(menubar);

	    var helpMenu = new qx.ui.menubar.Button("Help", null, this.getHelpMenu());
	    var logoutMenu = new qx.ui.menubar.Button("Log Out", null, this.getLogoutMenu());

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

	_logoutCommand : function()
	{
	    qx.bom.Cookie.del("ProjectEvergreen");
	    window.location="http://a167.myrootshell.com/";
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

