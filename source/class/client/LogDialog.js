/* ************************************************************************

#asset(projectx/*)
#require(qx.util.StringSplit)

************************************************************************ */

qx.Class.define("client.LogDialog",
{
    extend : qx.core.Object,

    construct : function(desktop, system, name)
    {
	this.base(arguments);

	this.__rrpc = new qx.io.remote.Rpc("/ralph", "ralph");
	this.__rrpc2 = new qx.io.remote.Rpc("/lisa/jsonrpc.pl", "lisa.main");
    },

    members :
    {
	//common
	__window : 0,
	__rrpc : 0,
	__rrpc2 : 0,
	__pos : 0,
	today : 0,
	searchstring : "",

	show : function(text, dim)
	{
	    if (this.__window == 0)
	    {
		this.__window = new qx.ui.window.Window("History Logs");
		this.__window.setLayout(new qx.ui.layout.VBox(5));
		this.__window.setModal(true);
		this.__window.setShowClose(true);

		var width = 700;
		var height = 400;

		if (dim.width < 700 + 40 + 40)
		{
		    width = dim.width - 80;
		}

		if (dim.height < 400 + 40 + 40)
		{
		    width = dim.height - 80;
		}

		this.__window.setWidth(width);
		this.__window.setHeight(height);

		var modearea = new qx.ui.container.Composite(new qx.ui.layout.HBox(10, "left"));
	     
		var rbSearch = new qx.ui.form.RadioButton("Search");
		var rbBrowse = new qx.ui.form.RadioButton("Browse");

		modearea.add(rbSearch);
		modearea.add(rbBrowse);

		var manager = new qx.ui.form.RadioGroup(rbSearch, rbBrowse);

		var hbox = new qx.ui.layout.HBox(10, "left");
		hbox.setAlignX("center");
		var navarea = new qx.ui.container.Composite(hbox);
		navarea.setPaddingBottom(4);

		var hbox2 = new qx.ui.layout.HBox(10, "left");
		hbox2.setAlignX("center");
		var searcharea = new qx.ui.container.Composite(hbox2);
		searcharea.setPaddingBottom(4);

		var searchInput = new qx.ui.form.TextField();
		searchInput.set({ maxLength: 200, width: 350 });
		searcharea.add(searchInput);

		manager.addListener("changeSelection", function (e)
				    {
					var label = (e.getData()[0]).getLabel();

					if (label == "Search")
					{
					    this.__window.remove(navarea);
					    this.__window.addAt(searcharea, 1);
					    searchInput.focus();
					    this.list.removeAll();
					    this.atom.setLabel("");
					}
					else
					{
					    this.__window.remove(searcharea);
					    this.__window.addAt(navarea, 1);
					    this.seek(0);
					}
				    }, this);

		searchInput.addListener("keypress", function(e) {
		    if (e.getKeyIdentifier() == "Enter")
		    {
			var input = searchInput.getValue();
			
			if (input !== "" && input !== null)
			{
			    this.searchstring = input;
			    this.atom.setLabel("Searching...");

			    input = input.replace(/[^a-z0-9 ]/g, "??");

			    this.__rrpc2.callAsync(
				qx.lang.Function.bind(this.__searchresult, this),
				"search", input);
			}
		    }
		}, this)

		var button1 = new qx.ui.form.Button("Search");
		searcharea.add(button1);

		button1.addListener("execute", function (e)
				    {
					var input = searchInput.getValue();

					this.searchstring = input;
					input = input.replace(/[^a-z0-9 ]/g, "??");

					this.atom.setLabel("Searching...");
					this.__rrpc2.callAsync(
					    qx.lang.Function.bind(this.__searchresult, this),
					    "search", input);
				    }, this);
				    
		this.b1 = new qx.ui.form.Button("Prev year");
		this.b2 = new qx.ui.form.Button("Prev month");
		this.b3 = new qx.ui.form.Button("Prev day");
		this.b4 = new qx.ui.form.Button("Next day");
		this.b5 = new qx.ui.form.Button("Next month");
		this.b6 = new qx.ui.form.Button("Next year");
	    
		this.b1.addListener(
		    "execute", function(e) {
			this.seek(365);
		    }, this);
		
		this.b2.addListener(
		    "execute", function(e) {
			this.seek(28);
		    }, this);
		
		this.b3.addListener(
		    "execute", function(e) {
			this.seek(1);
		    }, this);
		
		this.b4.addListener(
		    "execute", function(e) {
			this.seek(-1);
		    }, this);

		this.b5.addListener(
		    "execute", function(e) {
			this.seek(-28);
		    }, this);
		
		this.b6.addListener(
		    "execute", function(e) {
			this.seek(-365);
		    }, this);
		
		this.today = new qx.ui.basic.Label();
		this.today.setAlignY("middle");
		this.today.setMinWidth(100);
		this.today.setTextAlign("center");

		navarea.add(this.b1);
		navarea.add(this.b2);
		navarea.add(this.b3);
		navarea.add(this.today);
		navarea.add(this.b4);
		navarea.add(this.b5);
		navarea.add(this.b6);
	    
		this.__window.add(modearea);
		this.__window.add(searcharea);
		
		var infoarea = new qx.ui.container.Composite(
		    new qx.ui.layout.HBox(10, "left"));
	    
		this.list = new qx.ui.form.List;
		this.list.add(new qx.ui.form.ListItem(""));
		this.list.setAllowGrowY(true);

		var scroll = new qx.ui.container.Scroll();
	    
		scroll.set({
		    minWidth: 100,
		    minHeight: 50,
		    scrollbarY : "auto"
		});
	    
		this.atom = new qx.ui.basic.Atom("");
		this.atom.setRich(true);
		this.atom.setAllowGrowX(true);
		this.atom.setAllowGrowY(true);
		this.atom.setAlignY("top");
		scroll.add(this.atom);

		infoarea.add(this.list);
		infoarea.add(scroll, { flex : 1});
	    
		this.__window.add(infoarea, { flex : 1});
	    
		var logtext = new qx.ui.basic.Atom("The logs contain conversations from the last four weeks.");
		logtext.setMarginRight(15);
		var logon = new qx.ui.form.RadioButton("Enabled");
		logon.setMarginRight(10);
		var logoff = new qx.ui.form.RadioButton("Disabled");

		var close = new qx.ui.form.Button("Close");
		close.setAlignX("right");
		
		close.addListener(
		    "execute", function(e) {
			this.__window.close();
		    }, this);

		var logbox = new qx.ui.container.Composite(new qx.ui.layout.HBox());
		logbox.add(logtext);
//		logbox.add(logon);
//		logbox.add(logoff);
		logbox.add(new qx.ui.core.Spacer(50), {flex : 1});
		logbox.add(close);

		this.__window.add(logbox);
		
		var manager = new qx.ui.form.RadioGroup(logon, logoff);
		
		if (global_settings.getLoggingEnabled() == 1)
		{
		    logon.setValue(true);
		}
		else
		{
		    logoff.setValue(true);
		}

		logon.addListener("click", function(e) {
		    global_settings.setLoggingEnabled(1);
		}, this);

		logoff.addListener("click", function(e) {
		    global_settings.setLoggingEnabled(0);
		}, this);

		this.__window.setModal(true);
	    
		MainScreenObj.desktop.add(this.__window);
	    }

	    this.__window.center();
	    this.__window.open();
	},
	
	__sendresult : function(result, exc) 
	{
	    if (exc == null) 
	    {
		var pos = result.search(/<>/);
		var date = result.slice(0, pos);
		var data = result.slice(pos+2);
		
		if (this.__pos == 0)
		{
		    date = "Today";
		}
		
		this.today.setValue(date);
		
		var channels = data.split("<>");
		this.list.removeAll();

		for (var i=0; i < channels.length; i = i + 2)
		{
		    var tmp = new qx.ui.form.ListItem(channels[i]);
		    tmp.atom = this.atom		    
		    tmp.data = MainScreenObj.adjustTime(channels[i+1]);

		    tmp.addListener("click", function (e) {
			this.atom.setLabel(this.data);
		    }, tmp);

		    this.list.add(tmp);

		    if (i == 0)
		    {
			this.list.setSelection([tmp]);
		    }
		}

		if (channels.length > 1)
		{
		    this.atom.setLabel(MainScreenObj.adjustTime(channels[1]));
		}

		this.b1.setEnabled(true);
		this.b2.setEnabled(true);
		this.b3.setEnabled(true);
 
		if (this.__pos == 0)
		{
		    this.b4.setEnabled(false);
		}
		else
		{
		    this.b4.setEnabled(true);
		}
		
		if (this.__pos < 28)
		{
		    this.b5.setEnabled(false);
		}
		else
		{
		    this.b5.setEnabled(true);
		}
		
		if (this.__pos < 365)
		{
		    this.b6.setEnabled(false);
		}
		else
		{
		    this.b6.setEnabled(true);
		}
	    } 
	    else 
	    {
		alert("!!! Connection error, please reload this page: " + exc);
	    }
	},

	__searchresult : function(result, exc) 
	{
	    if (exc == null) 
	    {
		var hits = result.split("||");
		this.list.removeAll();

		if (result == "")
		{
		    this.atom.setLabel("Your search did not match any log files.");
		}
		else
		{
		    var firstitem = hits[0].split("|");
		    this.atom.setLabel("Loading conversation...");
		    this.list.setEnabled(false);
//		    this.__rrpc2.callAsync(
//			qx.lang.Function.bind(
//			    this.__showdayresult, this),
//			"get_day", firstitem[0], global_id, firstitem[1]);

		    for (var i=0; i < hits.length; i = i + 2)
		    {
			var item = hits[i].split("|");
			
			var tmp = new qx.ui.form.ListItem("Hit " + (i / 2 + 1));
			tmp.channel = item[1];
			tmp.date = item[0];
			tmp.rrpc = this.__rrpOBc2;
			tmp.logdialog = this;
			tmp.atom = this.atom;
			tmp.list = this.list;

			tmp.addListener("click", function (e) {
			    this.list.setEnabled(false);
			    this.atom.setLabel("Loading conversation...");
			    this.rrpc.callAsync(
				qx.lang.Function.bind(
				    this.logdialog.__showdayresult, this.logdialog),
				"get_day", this.date, global_id, this.channel);
			}, tmp);
			
			this.list.add(tmp);
			if (i == 0)
			{
			    this.list.setSelection([tmp]);
			}
		    }
		}
	    }
	    else
	    {
		alert("!!! Connection error, please reload the application: " + exc);
	    }
	},

	__showdayresult : function(result, exc) 
	{
	    this.list.setEnabled(true);

	    if (exc == null) 
	    {
		var words = this.searchstring.split(" ");

		for (var i=0; i < words.length; i++)
		{
		    var re = new RegExp(words[i], "ig"); 
		    result = result.replace(re, "<b style=\"background-color: #FF0000\">" + words[i] + "</b>");
		}
   
		this.atom.setLabel(MainScreenObj.adjustTime(result));
	    }
	    else
	    {
		alert("!!! Connection error, please reload the application: " + exc);
	    }
	},
	
	seek : function(days)
	{
	    this.__pos = this.__pos + days;

	    this.b1.setEnabled(false);
	    this.b2.setEnabled(false);
	    this.b3.setEnabled(false);
	    this.b4.setEnabled(false);
	    this.b5.setEnabled(false);
	    this.b6.setEnabled(false);

	    this.__rrpc.callAsync(
		qx.lang.Function.bind(this.__sendresult, this),
		"GETLOG", global_ids +
		    this.__pos);
	}
    }
});
