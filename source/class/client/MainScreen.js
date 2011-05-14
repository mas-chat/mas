
qx.Class.define("client.MainScreen",
{
    extend : qx.core.Object,

    construct : function(srpc, rootItem, logDialog, settings, infoDialog, anon_user)
    {
	this.base(arguments);

	this.windows = new Array();
	this.rpc = srpc;
	this.logDialog = logDialog;
	this.infoDialog = infoDialog
	this.settings = settings;
	this.anon_user = anon_user;

        this.__timer = new qx.event.Timer(1000 * 60);
        this.__timer.start();

        this.__topictimer = new qx.event.Timer(1000);

	this.__topictimer.addListener(
	    "interval", function(e) {
		//there seems to be bug in qooxdoo, one event can come after the timer is stopped
		if (this.__topictimeractive == true)
		{
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
		}
		else
		{
		    document.title = "MeetAndSpeak";
		}
	    }, this);

	this.__tt = new qx.ui.tooltip.ToolTip("Send Message");
	this.__myapp = rootItem;

	qx.bom.Element.addListener(window, "focus", function(e) { 

	    qx.event.Timer.once(function(e){
		document.title = "MeetAndSpeak";
	    }, this, 500); 
	    this.__blur = 0;

	    if (this.__topictimeractive == true)
	    {
		this.__topictimer.stop();
		this.__topictimeractive = false;
	    }

	    if (this.windows[this.activewin])
	    {
		this.windows[this.activewin].activatewin();
	    }	    
	}, this);

	qx.bom.Element.addListener(window, "blur", function(e) { 
	    this.__blur = 1;
	}, this);

	var soundFormat = "none"; 
	var detectAudio = new qx.bom.media.Audio();

	if (detectAudio.canPlayType("audio/mpeg") != "")
	{
	    soundFormat = "mp3";	
	}	
	else if (detectAudio.canPlayType("audio/ogg") != "")
	{
	    soundFormat = "ogg";
	}
	else if (detectAudio.canPlayType("audio/wave") != "")
	{
	    soundFormat = "wav";
	}

        if (soundFormat != "none")
	{
	    this.__audio = new qx.bom.media.Audio("/moescript/betty." + soundFormat);
	}
	
	debug.print("Sound support: " + soundFormat);
    },

    members :
    {
	manager : 0,
	activewin : 0,
	initdone : 0,
	rootContainer : 0,
	windows : null,
	showads : 1,
	FlashHelper : 0,
	desktop : 0,
	contactsButton : 0,
	rpc : 0,
	globalflist : 0,

	logDialog : 0,
	infoDialog : 0,
	settings : 0,
	anon_user : 0,
	nicks : 0,
	blocker : 0,
	statusMenu : 0,

	__part2 : 0,
	__audio : 0,
	__part3 : 0,
	__windowGroup : 0,
	__myapp : 0,
        __timer : 0,
        __topictimer : 0,
	__topicstate : 0,
	__firstCommand : 1,
	__tt : 0,
	__blur : 0,
	__input1 : 0,
	__topictimeractive : 0,
	__prevwin : -1,
	__msgvisible : 0,

	handleRpcError : function()
	{
	    var problem_label = new qx.ui.basic.Label(
		"<center>MeetAndSpeak is having some technical problems. Sorry!<br><br>You " +
		    "can try to reload this page in a few moments to see if the service is " + 
		    "back online.<br><br>We are trying to address the situation as quickly " +
		    "as possible.</center>").set({
			font : new qx.bom.Font(14, ["Arial", "sans-serif"]), width:500,
			height:150, rich: true});
	    
	    var margin_x = Math.round(qx.bom.Viewport.getWidth()/2)-500/2;
	    var margin_y = Math.round(qx.bom.Viewport.getHeight()/2) - 100;
	    
	    problem_label.setMargin(margin_y,10,10,margin_x);
	    this.__myapp.removeAll();
	    this.__myapp.add(problem_label, {flex : 1});
	},

	handleCommand : function(command, options)
	{
	    var doitagain = true;

	    switch(command)
	    {
	    case "COOKIE":
		this.rpc.cookie = options.shift();
		break;
		
	    case "CREATE":
		this.create_or_update_window(options, true);
		break;
		
	    case "UPDATE":
		this.create_or_update_window(options, false);
		break;
		
	    case "INITDONE":
		this.initdone = 1;
		var group = qx.bom.Cookie.get("ProjectEvergreenJoin");
		if (group != null)
		{
		    var data = group.split("-");
		    var main = this;

		    qx.bom.Cookie.del("ProjectEvergreenJoin");
		    this.infoDialog.showInfoWin(
			"Confirm", 
			"Do you want to join the group " + data[0] + "?", "Yes", 
			function()
			{
			    main.rpc.call("JOIN", data[0] + " MeetAndSpeak " + data[1]);
			}, "NO");
		}
		this.showMsgWindows();
		if (this.settings.getAutoArrange() == 1)
		{
		    this._arrangeCommand();
		}
		break;
		
	    case "ADDTEXT":
		var window_id = parseInt(options.shift());
		var type = parseInt(options.shift());
		var usertext = options.join(" ");
		
		usertext = this.adjustTime(usertext);
		this.windows[window_id].addline(usertext);
		
		if (this.windows[window_id].sound == 1 &&
		    type == 2 && this.initdone == 1)
		{
		    this.__audio.setCurrentTime(0);
		    this.__audio.play();
		}
		
		if (this.__blur == 1 && this.windows[window_id].titlealert == 1 &&
		    this.__topictimer.getEnabled() == false && this.__firstCommand != 1 &&
		    type == 2)
		{
		    this.__topictimeractive = true;
		    this.__topictimer.start();
		} 
		
		if (this.activewin.winid != window_id && this.initdone == 1)
		{
		    if (type == 1 && this.windows[window_id].isRed == false)
		    {
			this.windows[window_id].setGreen();
		    }
		    else if (type == 2)
		    {
			this.windows[window_id].setRed();
		    }
		    //else don't change color
		}
		break;
		
	    case "ADDNTF":
		var window_id = parseInt(options.shift());
		var note_id = options.shift();
		var usertext = options.join(" ");
		this.windows[window_id].addntf(note_id, usertext);
		break;
		
	    case "REQF":
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
			this.rpc.call("OKF", friend_id);
			//TODO: this relies on proper carbage collection
			this.rootContainer.remove(this.msg);
			this.__msgvisible = false;
		    }, this);
		    
		    decline.addListener("click", function () {
			this.rpc.call("NOKF", friend_id);
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
		var window_id = parseInt(options.shift());
		var usertext = options.join(" ");
		this.windows[window_id].changetopic(usertext);
		break;
		
	    case "NAMES":
		var window_id = parseInt(options.shift());
		this.windows[window_id].addnames(options);
		break;
		
	    case "ADDNAME":
		var window_id = parseInt(options.shift());
		options.shift(); // obsolete parameter
		var nick = options.shift();
		this.windows[window_id].addname(nick);
		break;
		
	    case "DELNAME":
		var window_id = parseInt(options.shift());
		var nick = options.shift();
		this.windows[window_id].delname(nick);
		break;
		
	    case "NICK":
		this.nicks = options;
		break;
		
	    case "A":
		this.showads = options.shift();
		break;
		
	    case "ADDURL":
		var window_id = parseInt(options.shift());
		var url = options.shift();
		this.windows[window_id].addUrl(url);
		break;
		
	    case "DIE":
                if (this.desktop === 0)
                {
                    this.show();
                }
                this.infoDialog.showInfoWin(
		    "Error",
                    "Session expired. <p>Press OK to login again.",
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
		    this.showads = 0;
		    this.show();
		}
		
		//var reason = param.slice(pos+1);
		this.infoDialog.showInfoWin(
		    "Error",	
		    "Your session expired, you logged in from another location, or<br>the server was restarted.<p>Press OK to restart.",
		    "OK", 
		    function () {
			window.location.reload(true);
		    });
		doitagain = false;
		break;
		
	    case "OK" :
		break;
		
	    case "INFO" :
                var param = options.join(" ");;

	        //TODO: big bad hack, fix: proper protocol
		if (param.substr(0, 30) == "You are already chatting with ")
		{
		    this.removeWaitText(this.globalflist, param.substr(30));
		}

		this.infoDialog.showInfoWin("Info", param, "OK");
		break;
		
	    case "CLOSE":
		var window_id = parseInt(options.shift());
		//TODO: call destructor?
		delete this.windows[window_id];
		break;
		
	    case "FLIST":
		this.updateFriendsList(this.globalflist, options.join(" "));
		break;
		
	    case "SET":
		this.settings.update(options.join(" "));
		//We have settings now, ready to draw main screen
		this.show();
		break;

	    case "KEY":
		var window_id = parseInt(options.shift());
		this.windows[window_id].apikey.setValue(options.shift());
		break;

	    case "OPERLIST":
		var window_id = parseInt(options.shift());
		var result = options.join(" ");
		var opers = result.split("<<>>"); 
		
		this.windows[window_id].configListOper.removeAll();
		
		for (var i=0; i < opers.length; i++)
		{
		    var tmp = opers[i].split("<>");
		    var tmpList = new qx.ui.form.ListItem(tmp[1]);
		    tmpList.userid = tmp[0];
		    this.windows[window_id].configListOper.add(tmpList);
		}
		break;

	    case "BANLIST":
		var window_id = parseInt(options.shift());
		var result = options.join(" ");
		var bans = result.split("<<>>"); 
		
		this.windows[window_id].configListBan.removeAll();
		
		for (var i=0; i < bans.length; i++)
		{
		    var tmp = bans[i].split("<>");
		    var tmpList = new qx.ui.form.ListItem(tmp[0]);
		    tmpList.banid = tmp[1];
		    this.windows[window_id].configListBan.add(tmpList);
		}
		break;

	    case "LOGS":
		var result = options.join(" ");
		this.logDialog.sendresult(result);
		break;
	    }

	    this.__firstCommand = 0;
	    return doitagain;
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
	    var visible = parseInt(options.shift());
	    var new_msgs = parseInt(options.shift());
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
		    new client.UserWindow(this.rpc, this.desktop,
					  topic, nw, name, type, sound, titlealert,
					  nw_id, usermode, password, new_msgs, 
					  this.infoDialog, window_id, this);
		
		if (type != 0 && this.initdone == 1)
                {
	            this.removeWaitText(this.globalflist, name);
                }

		if (x < 0)
		{
		    x = 0;
		}
		
		if (y < 0)
		{
		    y = 0;
		}

		if (height == -1)
		{
		    var myWidth = 0, myHeight = 0;
		    
		    //horror, for some reason getBounds doesn't work for 1st anon window
		    if( typeof( window.innerWidth ) == 'number' ) 
		    {
			//Non-IE
			myWidth = window.innerWidth;
			myHeight = window.innerHeight;
		    } 
		    else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) 
		    {
			//IE 6+ in 'standards compliant mode'
			myWidth = document.documentElement.clientWidth;
			myHeight = document.documentElement.clientHeight;
		    }
		    else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) 
		    {
			//IE 4 compatible
			myWidth = document.body.clientWidth;
			myHeight = document.body.clientHeight;
		    }

		    //anonymous user
		    height = Math.round(myHeight * 0.7);
		    width = Math.round(myWidth * 0.7);
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

		this.windows[window_id] = newWindow;

		this.addWindowButton(window_id, new_msgs);
	
		newWindow.show();
		
		//Keep these two last
		if (visible == 0)
		{
		    //Qooxdoo bug propably, therefore first show and then hide.
		    newWindow.hide();
		}

		newWindow.addHandlers();

		this.activewin = window_id;
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

	    this.windows[window_id].setFonts(this.settings.getLargeFonts());
	},

	adjustTime : function(text)
	{
	    var myRe = /<(\d+)>/g;
	    var timezone = this.rpc.timezone;

	    return text.replace(
		myRe, 
		function(m)
		{
		    var mytime = parseInt(m.substring(1, m.length-1)) - timezone;
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
		    
		    return hour + ":" + min;
		});
	},
	
	show : function()
	{
	    /* Root widget */
	    this.rootContainer = new qx.ui.container.Composite(
		new qx.ui.layout.VBox(0));

	    this.rootContainer.set({ backgroundColor: "#717172", padding:10});
	    this.rootContainer.add(this.getMenuBar());
	    
	    /* middle */
	    var windowManager = new qx.ui.window.Manager();
	    this.manager = windowManager;

	    var middleSection = new qx.ui.container.Composite(
		new qx.ui.layout.HBox(0));

	    //desktop
	    var middleContainer = new qx.ui.window.Desktop(windowManager);

	    middleContainer.addListener("resize", this.checkLimits,this);

	    this.desktop = middleContainer;
	    this.blocker = new qx.ui.core.Blocker(middleContainer);
	    this.blocker.setOpacity(0.5);
	    this.blocker.setColor("black");

	    middleContainer.set({decorator: "background2",
				 backgroundColor: "#DFE5E5"});
	    middleSection.add(middleContainer, {flex:1});

	    //ads
	    if (this.showads == 1)
	    {
		var iframe = new qx.ui.embed.Iframe("/iframe_part_from_google.html");
		iframe.set({ alignY:"middle", height: 605, width: 120, decorator : null });
		middleSection.add(iframe);
	    }

	    var friendScroll = new qx.ui.container.Scroll();
            friendScroll.setPadding(0,0,5,0);
	    friendScroll.set({ backgroundColor: "#e2e5eE"}); 

	    var friendContainer = new qx.ui.container.Composite(
		new qx.ui.layout.VBox());
	    friendContainer.set({ backgroundColor: "#e2e5eE"}); 
	    
	    var friendsLabel = new qx.ui.basic.Label("<b>Contact list:</b>").set({
                font : new qx.bom.Font(14, ["Arial", "sans-serif"]), textColor: "#cc448b"});
            friendsLabel.setRich(true);
	    friendsLabel.setPaddingTop(10);
	    friendsLabel.setPaddingBottom(10);
	    friendsLabel.setPaddingLeft(10);
            
            friendContainer.add(friendsLabel);
	    	    
            var fgrid = new qx.ui.layout.Grid();
	    this.globalflist = new qx.ui.container.Composite(fgrid);
	    this.globalflist.setAllowGrowY(true);
	    this.globalflist.setAllowGrowX(true);
	    fgrid.setColumnWidth(0, 185);
	    
	    friendContainer.add(this.globalflist, {flex: 1});

	    var addContainer = new qx.ui.container.Composite(
		new qx.ui.layout.HBox());

	    this.__input1 = new qx.ui.form.TextField();
	    this.__input1.setPlaceholder("<nickname>");
	    this.__input1.setMarginTop(10);
	    this.__input1.setMarginBottom(8);
	    this.__input1.setMarginLeft(8);

	    addContainer.add(this.__input1, {flex: 1});
	    addContainer.add(new qx.ui.core.Spacer(8));

	    var button1 = new qx.ui.form.Button("Add");
	    button1.setMarginTop(10);
	    button1.setMarginBottom(8);
	    button1.setMarginRight(8);
	    addContainer.add(button1);

	    friendContainer.add(addContainer);

	    button1.addListener("execute", function (e) {
		this.rpc.call("ADDF", this.__input1.getValue());
		this.__input1.setValue("");
	    }, this);

	    this.rootContainer.add(middleSection, {flex:1});		
	    
	    // create the toolbar
	    toolbar = new qx.ui.toolbar.ToolBar();
	    toolbar.set({ maxHeight : 40, spacing : 30 });
	    
	    // create and add Part 1 to the toolbar
	    this.__part2 = new qx.ui.toolbar.Part();
	    this.__part3 = new qx.ui.toolbar.Part();
	    
	    toolbar.add(this.__part2);
	    toolbar.addSpacer();

	    //popup
	    var contactsPopup = new qx.ui.popup.Popup(new qx.ui.layout.HBox(5));
	    contactsPopup.set({ autoHide : true, height : 400, width : 250 });

	    friendScroll.add(friendContainer);
	    friendScroll.set({
		scrollbarX : "auto",
		scrollbarY : "auto"
	    });

	    contactsPopup.add(friendScroll, {flex : 1});

	    if (this.anon_user == false)
	    {
		var contactsButton = new qx.ui.toolbar.CheckBox("<font color=\"#cccccc\">Show Contacts</font>");
		contactsButton.setRich(true);
		this.contactsButton = contactsButton;

		this.__part3.add(contactsButton);	
    
		contactsButton.setValue(false);

		contactsButton.addListener("changeValue", function (e) {
		    if (e.getData() == true)
		    {
			contactsPopup.placeToWidget(contactsButton);
			contactsPopup.show();
		    }
		}, middleSection);

  	        contactsPopup.addListener("disappear", function (e) {
                    contactsButton.setValue(false);   
	        });
		
		this.__timer.addListener(
		    "interval", function(e) { this.updateIdleTimes(
			this.globalflist); },
		    this);
	    
	    	toolbar.add(this.__part3);
	    }

	    this.rootContainer.add(toolbar);
	    this.__myapp.add(this.rootContainer, {flex : 1, edge: 0}); //, {padding : 10});	    

	    this.__windowGroup = new client.RadioManager();
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
						       "</b>&nbsp;(" + columns[3] + ")");
                    var friend2 = new qx.ui.basic.Label();
                    var friend3 = new qx.ui.basic.Label();

		    friend3.setRich(true);	
		    friend3.setValue("<font color=\"green\">|chat|</font>");
		    friend3.nickname = columns[3];
		    friend3.rrpc = this.rpc;
                    friend3.waiting = false;		    
		    friend3.mainscreen = this;

		    friend3.addListener("click", function (e) {
			this.rrpc.call("STARTCHAT", "MeetAndSpeak " + this.nickname);
                        this.setValue("<font color=\"green\">Wait..</font>");
                        this.waiting = true;
		    }, friend3);
		    
		    friend3.addListener("mouseover", function (e) {
                        if (this.waiting == false)
                        {
			    this.setValue("<font color=\"green\"><u>|chat|<u></font>");
                        }
		    }, friend3);
		    
		    friend3.addListener("mouseout", function (e) {
                        if (this.waiting == false)
                        {
		            this.setValue("<font color=\"green\">|chat|</font>");
                        }
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

		    var online = 2;

		    if(columns[0] == 0)
		    {
			online = 1;
		    }

		    //update groups also
		    for (var ii=0; ii < this.windows.length; ii++)
		    {
			if (typeof(this.windows[ii]) != 'undefined')
			{
			    this.windows[ii].setUserStatus(columns[3], online);
			}
		    }
		} 
	    }
	    else
	    {
		var nofriends = new qx.ui.basic.Label("No friends added<p>You can add new contacts by<br> using the field below<br>or by right-clicking <br>a name in any group window.<p>You can send messages <br>and see status information<br> of your friends.");
		nofriends.setRich(true);
		
		nofriends.setPaddingLeft(10);
		parentFList.add(nofriends, {row: 0, column: 0});
	    }

	    this.printIdleTimes(parentFList);
        }, 

	expandMOTD : function()
	{
	    this.windows[this.activewin].expandMOTD();
	},

        printIdleTimes : function(parentFList)
        {
            var children = parentFList.getChildren();
	    var online = 0;

            for (var i=1; i < children.length; i = i + 3)
            {
	        var idle = children[i].idleTime;
                var result;
		
		if (idle == 0)
                {
		    result = "<font color=\"green\">ONLINE<font>";
		    online++;
                }
                else if (idle < 60)
                {			
                    result = "<font color=\"blue\">Last&nbsp;activity:&nbsp;" + idle +
			"&nbsp;mins&nbsp;ago</font>";
                }
		else if (idle < 60 * 24)
                {  
	            idle = Math.round(idle / 60);
		    if (idle == 0)
		    {
			idle = 1;
		    }

                    result = "<font color=\"blue\">Last&nbsp;activity:&nbsp;" + idle +
			"&nbsp;hours&nbsp;ago</font>";
                }
		else if (idle < 5000000)
                {  
	            idle = Math.round(idle / 60 / 24);
		    if (idle == 0)
		    {
			idle = 1;
		    }

                    result = "<font color=\"blue\">Last&nbsp;activity:&nbsp;" + idle +
			"&nbsp;days&nbsp;ago</font>";
                }
		else
		{
		    result = "<font color=\"blue\">Last&nbsp;activity:</font>&nbsp;Unknown";
		}
		
		children[i].setValue(result);
            }	

	    var onlineText = "";

	    if (online > 0)
	    {
		onlineText = " (Online: " + online + ")";
	    }

	    this.contactsButton.setLabel("<font color=\"#cccccc\">Show contacts" + onlineText + "</font>"); 
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
	    
        removeWaitText : function(parentFList, nick)
        {
            if (!parentFList)
            {
                return;
            }

            var children = parentFList.getChildren();
	    
            for (var i=2; i < children.length; i = i + 3)
            {
		if (children[i].nickname == nick)
                {
		    children[i].setValue("<font color=\"green\">|chat|</font>");
                }
            }	
        },

	removeWindowButton : function(winid)
	{
	    if (this.windows[winid])
	    {
		this.__windowGroup.remove(this.windows[winid].taskbarControl);
		this.__part2.remove(this.windows[winid].taskbarButton);
	    }
	},

	addWindowButton : function(winid, new_msgs)
	{
	    if (this.windows[winid])
	    {
		var item = new qx.ui.toolbar.RadioButton();
		item.winid = winid;
		item.mainscreenobj = this;

		item.addListener("execute", function () {
		    this.windows[winid].setNormal();
		    
		    if (winid != this.__prevwin)
		    {
			this.switchToWindow(winid);
		    }
		    else if (winid == this.__prevwin && this.windows[winid].hidden == true)
                    {
                        this.windows[winid].show();
                    }
                    else if (winid == this.__prevwin)
                    {
                        this.windows[winid].hide();
                    }
		    this.__prevwin = winid;
		}, this);

		// Link from window object to its taskbarbutton.
		this.windows[winid].taskbarButton = item;
		this.windows[winid].taskbarControl = this.__windowGroup;
		item.setRich(true);
		item.setMarginRight(4);
		
		this.__part2.add(item);
		this.__windowGroup.add(item);
		this.__windowGroup.setSelection([item]);

		if (new_msgs == 1)
		{
		    this.windows[winid].setGreen();
		}
		else if (new_msgs == 2)
		{
		    this.windows[winid].setRed();
		}
		else if (new_msgs == 0)
		{
		    this.windows[winid].setNormal();
		}
	    }

	    this.activewin = winid;
	    this.windows[winid].activatewin();
	},

	activateNextWin : function(direction)
	{
	    var i = 0; // agains bugs
	    var cur = 0;
	    var previous = this.activewin;

	    do
	    {
		if (direction == "up")
		{
		    this.__windowGroup.selectNext();
		}
		else
		{
		    this.__windowGroup.selectPrevious();
		}
		i++;
		cur = this.__windowGroup.getSelection()[0].winid;
	    }
	    while (i != 30 && this.windows[cur].hidden == true);

	    if (cur != previous)
	    {
		this.__windowGroup.getSelection()[0].execute();
	    }
	},

	switchToWindow : function(e)
	{
	    if (this.windows[e])
	    {
		this.windows[e].show();
		this.windows[e].setNormal();
		this.activewin = e;
		this.windows[e].activatewin();
	    }
	},

	getMenuBar : function()
	{
	    var frame = new qx.ui.container.Composite(new qx.ui.layout.Grow);

	    var menubar = new qx.ui.menubar.MenuBar;
	    menubar.setAllowGrowX(true);
	    menubar.set({decorator: "menu2", textColor : "#cccccc"});

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

	    this.statusMenu = new qx.ui.menubar.Button("", null);
	    this.statusMenu.setRich(true);

	    var motdMenu = new qx.ui.menubar.Button("<a target=\"_blank\" href=\"http://getsatisfaction.com/meetandspeak/\"><font color=\"yellow\">Got&nbsp;an&nbsp;improvement&nbsp;idea?&nbsp;Click&nbsp;here!</font></a>", null);
	    motdMenu.setRich(true);

            qx.event.Timer.once(function(e){
		motdMenu.setLabel("");
	    }, this, 1000 * 30); 

	    if (this.anon_user == false)
	    {
		menubar.add(forumMenu);
	    }

	    menubar.add(viewMenu);
	    menubar.add(settingsMenu);

	    if (this.anon_user == false)
	    {
		menubar.add(advancedMenu);
	    }

	    menubar.add(helpMenu);
	    menubar.add(logoutMenu);

	    menubar.addSpacer();
	
	    menubar.add(motdMenu);
	    menubar.add(this.statusMenu);
	
	    return frame;
	},

	setStatusText : function(text)
	{
	    this.statusMenu.setLabel(text);
	},

	getLogoutMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var logoutButton = new qx.ui.menu.Button("Log out");
	    menu.add(logoutButton);
	    logoutButton.addListener("execute", this._logoutCommand, this);

	    return menu;
	},

	getHelpMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var manualButton = new qx.ui.menu.Button("Support Web site");
	    var keyButton = new qx.ui.menu.Button("Keyboard commands and shortcuts...");
	    var aboutButton = new qx.ui.menu.Button("About...");

	    manualButton.addListener("execute", this._manualCommand, this);
	    aboutButton.addListener("execute", this._aboutCommand, this);
	    keyButton.addListener("execute", this._keyCommand, this);

	    menu.add(manualButton);
	    menu.add(keyButton);
	    menu.addSeparator();
	    menu.add(aboutButton);

	    return menu;
	},

	getForumMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var createButton = new qx.ui.menu.Button("Create new group...");
	    var joinButton = new qx.ui.menu.Button("Join existing group...");

	    createButton.addListener("execute", this._createForumCommand, this);
	    joinButton.addListener("execute", this._joinForumCommand, this);

	    menu.add(createButton);
	    menu.add(joinButton);

	    return menu;
	},

	getViewMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var logsButton = new qx.ui.menu.Button("Show logs...");
	    var arrangeButton = new qx.ui.menu.Button("Arrange windows");

	    logsButton.addListener("execute", this._logsCommand, this);
	    arrangeButton.addListener("execute", this._arrangeCommand, this);

	    if (this.anon_user == false)
	    {
		menu.add(logsButton);
	    }
	    menu.add(arrangeButton);

	    return menu;
	},

	getSettingsMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var sslButton = new qx.ui.menu.CheckBox("Always use HTTPS");
	    var fontButton = new qx.ui.menu.CheckBox("Small font");
	    var arrangeButton = new qx.ui.menu.CheckBox("Auto-arrange windows at startup");

	    if (this.settings.getSslEnabled() == 1)
	    {
		sslButton.setValue(true);
	    }
	    if (this.settings.getLargeFonts() == 0)
	    {
		fontButton.setValue(true);
	    }
	    if (this.settings.getAutoArrange() == 1)
	    {
		arrangeButton.setValue(true);
	    }

	    sslButton.addListener("changeValue", this._sslCommand, this);
	    fontButton.addListener("changeValue", this._fontCommand, this);
	    arrangeButton.addListener("changeValue", this._autoArrangeCommand, this);

	    if (this.anon_user == false)
	    {
		menu.add(sslButton);
	    }
	    menu.add(fontButton);
	    menu.add(arrangeButton);

	    return menu;
	},

	getAdvancedMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;
	    var joinButton = new qx.ui.menu.Button("Join IRC channel...");

	    joinButton.addListener("execute", this._joinIRCCommand, this);
	    menu.add(joinButton);

	    return menu;
	},

	_joinIRCCommand : function(app)
	{
	    this.infoDialog.getJoinNewChannelWin(this.__myapp, 1);
	},

	_logsCommand : function(app)
	{
	    this.logDialog.show(this.__myapp, this.desktop.getBounds());
	},

	_joinForumCommand : function(app)
	{
	    this.infoDialog.getJoinNewChannelWin(this.__myapp, 0);
	},

	_createForumCommand : function()
	{
	    this.infoDialog.getCreateNewGroupWin(this.__myapp, 0);
	},

	_arrangeCommand : function()
	{
	    var x=[0,1,2,3,2,3,3,3,3,3,4,4,4,4,4,4,4];
	    var y=[0,1,1,1,2,2,2,3,3,3,3,3,4,4,4,4,4];
	    var amount = 0;

	    this.blocker.block();

	    qx.event.Timer.once(function(e){
		for (var i=0; i < this.windows.length; i++)
		{
		    if (typeof(this.windows[i]) != 'undefined' &&
			this.windows[i].hidden == false)
		    {
			amount++;
		    }
		}
				
		var dim = this.desktop.getBounds();		
		
		if (!dim || amount == 0 || amount > 16)
		{
		    // !dim is ???
		    this.blocker.unblock();
		    debug.print("unkown dim");
		    return;
		}
		
		var width = Math.floor((dim.width - (6 * (x[amount] + 1))) / x[amount]);
		var height = Math.floor((dim.height - (6 * (y[amount] + 1))) / y[amount]);
		
		var cx = 0;
		var cy = 0;
		var current = 0;
		
		for (var i=0; i < this.windows.length; i++)
		{
		    if (typeof(this.windows[i]) != 'undefined' &&
			this.windows[i].hidden == false)
		    {
			current++;
			
			this.windows[i].moveTo(6 * (cx + 1) + cx * width, 6 * (cy + 1) + cy * height);	
			this.windows[i].setHeight(height);
			
			if (current == amount)
			{
			    var missing = x[amount] * y[amount] - amount;
			    width = width + missing * width + 6 * missing;
			}
			
			this.windows[i].setWidth(width);
			this.windows[i].scrollToBottom();
			cx++;
			
			if (cx == x[amount])
			{
			    cx = 0;
			    cy++;
			}
		    }
		}

		this.blocker.unblock();
	    }, this, 10);
	},

	_sslCommand : function(e)
	{
	    var usessl = e.getData();

	    if (usessl == true)
	    {
		this.settings.setSslEnabled(1);
		qx.bom.Cookie.set("UseSSL", "yes", 100, "/");
	    }
	    else
	    {
		this.settings.setSslEnabled(0);
		qx.bom.Cookie.set("UseSSL", "no", 100, "/");
	    }

	    this.infoDialog.showInfoWin("Info", "The application is now being reloaded to activate<br> the change.", "OK", function() {
		window.location.reload(true);
	    });
	},


	_fontCommand : function(e)
	{
	    var smallfonts = e.getData();

	    if (smallfonts == true)
	    {
		this.settings.setLargeFonts(0);
	    }
	    else
	    {
		this.settings.setLargeFonts(1);
	    }
	    
	    this.updateFonts();
	},

	_autoArrangeCommand : function(e)
	{
	    var autoarrange = e.getData();

	    if (autoarrange == true)
	    {
		this.settings.setAutoArrange(1);
	    }
	    else
	    {
		this.settings.setAutoArrange(0);
	    }
	},

	updateFonts : function()
	{
	    for (var i=0; i < this.windows.length; i++)
	    {
		if (typeof(this.windows[i]) != 'undefined')
		{
		    this.windows[i].setFonts(this.settings.getLargeFonts());
		}
	    }
	},

	showMsgWindows : function()
	{
	    for (var i=0; i < this.windows.length; i++)
	    {
		if (typeof(this.windows[i]) != 'undefined' && this.windows[i].type == 1)
		{
		    this.manager.bringToFront(this.windows[i].window);
		}
	    }
	},

	_logoutCommand : function()
	{
	    this.rpc.call("LOGOUT", "");

	    //TODO: create LOGOUTOK response and move this to there: 
	    qx.event.Timer.once(function(e){
		qx.bom.Cookie.del("ProjectEvergreen");
		window.location.reload(true);
	    }, this, 1500); 
	},

	_manualCommand : function()
	{
	    var newWindow = window.open("/support.html", '_blank');
	    newWindow.focus();
	},

	_aboutCommand : function()
	{
	    this.infoDialog.showInfoWin("About", "<br><br><br><center><img src=\"/i/mas_logo_small.png\"></center><p><b><br><br><center><h2 style=\"color: #000022;\">MeetAndSpeak Web Client</center></h2></b><p><center>Version: 1.0.__MOE_VERSION__.szyslak</center><br><p style=\"padding-bottom:1px;\">&copy; 2010-2011 <a href=\"/about.html\">MeetAndSpeak Ltd</a>. All rights reserved.</p><br><br>", "OK");
	},

	_keyCommand : function()
	{
	    this.infoDialog.showInfoWin("Shortcuts", "<b>Keyboard shortcuts:</b><p><table border=0><tr><td>[TAB]</td><td>= nick name completion</td></tr><tr><td>[Arrow Up]</td><td>= Switch to next visible window</td></tr><tr><td>[Arrow Down]</td><td>= Switch to previous visible windows</td></tr></table><p>To send a notification to others in the group, start your line<br>with an exclamation mark '!' followed by a space character. You can delete received<br>notifications whenever you like by double-clicking them.<p>Notifications are handy as they stay always visible. You can<br>be sure that everyone will see them.<p>See other available commands by typing<br>'/help' in any of the windows.", "OK");
	}
    }
});

