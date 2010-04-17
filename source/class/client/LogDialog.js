/* ************************************************************************

#asset(projectx/*)
#require(qx.util.StringSplit)

************************************************************************ */

qx.Class.define("client.LogDialog",
{
    extend : qx.core.Object,

    construct : function(srpc, settings)
    {
	this.base(arguments);

	this.rpc = srpc;
	this.settings = settings;
	this.__rpclisa = new qx.io.remote.Rpc("/lisa/jsonrpc.pl", "lisa.main");
    },

    members :
    {
	rpc : 0,
	today : 0,
	weeks : 0,
	searchstring : "",
	searchInput : 0,
	settings : 0,
	mainscreen : null,
	iframe : 0,

	__window : 0,
	__rpclisa : 0,
	__pos : 0,
	
	show : function(text, dim)
	{
	    if (this.__window == 0)
	    {
		this.__window = new qx.ui.window.Window("History Logs");
		this.__window.setAppearance("aie-mtsk-window");
		this.__window.setLayout(new qx.ui.layout.VBox(5));
		this.__window.set({contentPadding: [10,10,10,10]});

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
	     
		var rbSearch = new qx.ui.form.RadioButton("Search (beta)");
		var rbBrowse = new qx.ui.form.RadioButton("Browse");

		modearea.add(rbBrowse);
		modearea.add(rbSearch);

		var manager = new qx.ui.form.RadioGroup(rbBrowse, rbSearch);

		var hbox = new qx.ui.layout.HBox(10, "left");
		hbox.setAlignX("center");
		var navarea = new qx.ui.container.Composite(hbox);
		navarea.setPaddingBottom(4);

		var hbox2 = new qx.ui.layout.HBox(10, "left");
		hbox2.setAlignX("center");
		var searcharea = new qx.ui.container.Composite(hbox2);
		searcharea.setPaddingBottom(4);

		this.searchInput = new qx.ui.form.TextField();
		this.searchInput.set({ maxLength: 200, width: 350 });
		searcharea.add(this.searchInput);

		var iframe = new qx.ui.embed.Iframe();
		this.iframe = iframe;

		this.searchInput.addListener("keypress", function(e) {
		    if (e.getKeyIdentifier() == "Enter")
		    {
			var input = this.searchInput.getValue();
			
			if (input !== "" && input !== null)
			{
			    this.__startSearch();
			}
		    }
		}, this)

		var button1 = new qx.ui.form.Button("Search");
		searcharea.add(button1);

		button1.addListener("execute", this.__startSearch, this);
				    
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
		this.__window.add(navarea);
		this.seek(0);
		
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

		this.weeks = new qx.ui.basic.Label();
		this.weeks.setMarginRight(15);

		manager.addListener("changeSelection", function (e)
				    {
					var label = (e.getData()[0]).getLabel();

					if (label == "Search (beta)")
					{
					    this.__window.remove(navarea);
					    this.__window.addAt(searcharea, 1);
					    this.searchInput.focus();
					    this.list.removeAll();
					    this.atom.setLabel("");
					    infoarea.remove(scroll);
					    infoarea.add(iframe, { flex : 1});
					}
					else
					{
					    this.__window.remove(searcharea);
					    this.__window.addAt(navarea, 1);
					    this.seek(0);
					    infoarea.remove(iframe);
					    infoarea.add(scroll, { flex : 1});
					}
				    }, this);
		
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
		logbox.add(this.weeks);
//		logbox.add(logon);
//		logbox.add(logoff);
		logbox.add(new qx.ui.core.Spacer(50), {flex : 1});
		logbox.add(close);

		this.__window.add(logbox);
		
		var manager = new qx.ui.form.RadioGroup(logon, logoff);
		
		if (this.settings.getLoggingEnabled() == 1)
		{
		    logon.setValue(true);
		}
		else
		{
		    logoff.setValue(true);
		}

		logon.addListener("click", function(e) {
		    this.settings.setLoggingEnabled(1);
		}, this);

		logoff.addListener("click", function(e) {
		    this.settings.setLoggingEnabled(0);
		}, this);

		this.__window.setModal(true);
	    
		this.mainscreen.desktop.add(this.__window);
	    }

	    this.__window.center();
	    this.updateLogLength();
	    this.__window.open();
	},

	__startSearch : function()
	{
	    var input = this.searchInput.getValue();
	    var doit = true;

	    this.searchstring = input;

	    for (var i=0; i < input.length; i++) 
	    {
		if (input.charCodeAt(i) > 127) 
		{
		    //glimpse supports only ascii (utf7 is a real workaround solution :) )
		    doit = false;
		}
	    }

	    if (doit == true)
	    {
		this.atom.setLabel("Searching...");
		this.__rpclisa.callAsync(
		    qx.lang.Function.bind(this.__searchresult, this),
		    "search", input);
	    }
	    else
	    {
		this.atom.setLabel("Your search string contains unsupported special character(s).");
	    }
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
		    tmp.data = this.mainscreen.adjustTime(channels[i+1]);

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
		    this.atom.setLabel(this.mainscreen.adjustTime(channels[1]));
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

		    for (var i=0; i < hits.length; i = i + 2)
		    {
			var item = hits[i].split("|");
			
			var tmp = new qx.ui.form.ListItem("Hit " + (i / 2 + 1));
			tmp.date = item[0];
			tmp.chan = escape(item[1]);
			tmp.rpc = this.rpc;
			tmp.tz = this.mainscreen.timezone;
			tmp.st = escape(this.searchstring);

			tmp.addListener("click", function (e) {
			    this.iframe.setSource("/tools/get_day.pl?id=" +  this.rpc.id +
						  "&sec=" + ths.rpc.sec + "&cookie=" + this.rpc.cookie +
						  "&date=" + this.date + "&chan=" + this.chan +
						  "&tz=" + this.tz + "&st=" + this.st);
			}, tmp);
			
			this.list.add(tmp);
			if (i == 0)
			{
			    this.list.setSelection([tmp]);
			}
		    }

		    //auto load first item
		    this.iframe.setSource("/tools/get_day.pl?id=" +  this.rpc.id +
					  "&sec=" + this.rpc.sec + "&cookie=" + this.rpc.cookie +
					  "&date=" + firstitem[0] + "&chan=" +  escape(firstitem[1]) +
					  "&tz=" + this.mainscreen.timezone + "&st=" + 
					  escape(this.searchstring)); 
		}
	    }
	    else
	    {
		alert("!!! Connection error, please reload the application: " + exc);
	    }
	},

	updateLogLength : function()
	{
	    var firstDate = new Date('2/1/2010 0:00');
	    var now = new Date();
	    var numWeeks = (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
	    numWeeks =  Math.round(numWeeks*Math.pow(10,7))/Math.pow(10,7);

	    this.weeks.setValue("The logs contain conversations from the last " + numWeeks + " weeks.");
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

	    this.rpc.read("GETLOG", this.__pos, this, this.__sendresult);
	}
    }
});
