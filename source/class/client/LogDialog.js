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

	this.__rrpc = new qx.io.remote.Rpc(
	    ralph_url + "/",
	    "ralph"
	);
    },

    members :
    {
	//common
	__window : 0,
	__rrpc : 0,
	__pos : 0,
	today : 0,

	show : function(text, showok, callback)
	{
	    if (this.__window == 0)
	    {
		this.__window = new qx.ui.window.Window("");
		this.__window.setLayout(new qx.ui.layout.VBox(5));
		this.__window.setModal(true);
		this.__window.setShowClose(false);
		this.__window.moveTo(400, 300);
		
		var navarea = new qx.ui.container.Composite(
		    new qx.ui.layout.HBox(10, "left"));

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
		this.list.add(new qx.ui.form.ListItem("Portaali"));
		this.list.setAllowGrowY(true);

		var scroll = new qx.ui.container.Scroll();
	    
		scroll.set({
		    minWidth: 100,
		    minHeight: 50,
		    scrollbarY : "on"
		});
	    
		this.atom = new qx.ui.basic.Atom("");
		this.atom.setRich(true);
		this.atom.setAllowGrowX(true);
		scroll.add(this.atom);

		infoarea.add(this.list);
		infoarea.add(scroll, { flex : 1});
	    
		this.__window.add(infoarea);
	    
		var close = new qx.ui.form.Button("Close");
		
		close.addListener(
		    "execute", function(e) {
			this.__window.close();
		    }, this);
	    
		this.__window.add(close);
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
		    tmp.data = channels[i+1];

		    tmp.addListener("click", function (e) {
			this.atom.setLabel(this.data);
		    }, tmp);

		    this.list.add(tmp);
		}

		if (channels.length > 1)
		{
		    this.atom.setLabel(channels[1]);
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
		"GETLOG", global_id + " " + global_sec + " " +
		    this.__pos);
	}
    }
});
