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
    },

    members :
    {
	//common
	__window : 0,
	__rrpc : 0,
	__pos : 0,
	today : 0,

	show : function(text, dim)
	{
	    if (this.__window == 0)
	    {
		this.__window = new qx.ui.window.Window("History Logs");
		this.__window.setLayout(new qx.ui.layout.VBox(5));
		this.__window.setModal(true);
		this.__window.setShowClose(false);
		this.__window.moveTo(40, 40);

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

		var hbox = new qx.ui.layout.HBox(10, "left");

		var navarea = new qx.ui.container.Composite(hbox);
		hbox.setAlignX("center");
		navarea.setPaddingBottom(4);

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
	    
		this.__window.add(navarea);
		
		var infoarea = new qx.ui.container.Composite(
		    new qx.ui.layout.HBox(10, "left"));
	    
		this.list = new qx.ui.form.List;
		this.list.add(new qx.ui.form.ListItem("Wait.."));
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
	    
		var logtext = new qx.ui.basic.Atom("Logs contain conversations from past ten days.");
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

	    this.seek(0);
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
		alert("!!! Exception during async call: " + exc);
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
