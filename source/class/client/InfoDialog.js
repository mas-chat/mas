/* ************************************************************************

#asset(projectx/*)
#require(qx.util.StringSplit)

************************************************************************ */

qx.Class.define("client.InfoDialog",
{
    extend : qx.core.Object,

    construct : function(desktop, system, name)
    {

	this.__window = new qx.ui.window.Window("");
	this.__window.setLayout(new qx.ui.layout.VBox(10));
	this.__window.setModal(true);
	this.__window.setShowClose(false);
	this.__window.moveTo(400, 300);
		
	this.__message = new qx.ui.basic.Atom("", "");
	this.__message2 = new qx.ui.basic.Atom("", "");
	
	this.__box = new qx.ui.container.Composite;
	this.__box.setLayout(new qx.ui.layout.HBox(10, "right"));

	this.__combo = new qx.ui.form.ComboBox();

	this.__box2 = new qx.ui.container.Composite;
	this.__box2.setLayout(new qx.ui.layout.HBox(10, "left"));
	
	this.__yesbutton = new qx.ui.form.Button("Yes", "icon/16/actions/dialog-ok.png");
	
	this.__nobutton = new qx.ui.form.Button("No", "icon/16/actions/dialog-cancel.png");

	this.__input = new qx.ui.form.TextField("").set({
		maxLength: 25
	});

	this.__rrpc = new qx.io.remote.Rpc(
	    ralph_url + "/",
	    "ralph"
	);
    },

    members :
    {
	//common
	__window : 0,
	__message : 0,
	__message2 : 0,
	__box : 0,
	__box2 : 0,
	__yesbutton : 0,
	__nobutton : 0,
	__yeslistenerid : 0,
	__nolistenerid : 0,
	__input : 0,
	__combo : 0,
	__nwselection : "Evergreen",
	__rrpc : 0,

	getLoginFailedWin : function(rootItem)
	{
	    this.__window.removeAll();

	    this.__window.add(this.__message);

	    this.__message.setLabel("Wrong email addres and/or password. Please try again.");
	    this.__window.setCaption("Login error");

	    this.__window.add(this.__box);

	    this.__yesbutton.setLabel("OK");
	    this.__box.add(this.__yesbutton);

	    if (this.__yeslistenerid != 0) {
		this.__yesbutton.removeListener(this.__yeslistenerid);
	    }

	    this.__yeslistenerid = this.__yesbutton.addListener("execute", function(e) {
		this.__window.close();
	    }, this);

	    rootItem.add(this.__window);
	    this.__window.open();
	},

	getJoinNewChannelWin : function(rootItem, mode)
	{
	    this.__window.removeAll();
	    
	    this.__window.add(this.__message);
	    
	    if (mode == 0)
	    {
		this.__window.setCaption("Join to new forum");
		this.__message.setLabel("Type forum name you wish to join:");
	    }
	    else
	    {
		this.__window.setCaption("Join to new IRC channel");
		this.__message.setLabel("Type IRC channel name you wish to join:");
	    }

	    this.__input.focus();

	    this.__window.add(this.__input);

	    this.__window.add(this.__box2);
	    this.__window.add(this.__box);

	    this.__box.removeAll();
	    this.__box2.removeAll();

	    this.__yesbutton.setLabel("OK");
	    this.__box.add(this.__yesbutton);
	    this.__nobutton.setLabel("Cancel");
	    this.__box.add(this.__nobutton);

	    if (mode == 1)
	    {
		this.__message2.setLabel("Network:");

		this.__combo.removeAll();
		//TODO: configuration system needed, now UPDATE THIS manually!	    
		this.__combo.add(new qx.ui.form.ListItem("IRCNet"));
		this.__combo.add(new qx.ui.form.ListItem("FreeNode"));
		this.__combo.add(new qx.ui.form.ListItem("W3C"));
	    
		this.__combo.setValue("IRCNet");
		this.__nwselection = "IRCNet";

		this.__combo.addListener("changeValue", function(e) {
		    this.__nwselection = e.getData();
		}, this);
	    
		this.__box2.add(this.__message2);
		this.__box2.add(this.__combo);
	    }
	    else
	    {
		this.__nwselection = "Evergreen";
	    }
	    
	    
	    if (this.__nolistenerid != 0) {
		this.__nobutton.removeListener(this.__nolistenerid);
	    }

	    this.__nolistenerid = this.__nobutton.addListener("execute", function(e) {
		this.__window.close();
	    }, this);

	    if (this.__yeslistenerid != 0) {
		this.__yesbutton.removeListener(this.__yeslistenerid);
	    }

	    this.__yeslistenerid = this.__yesbutton.addListener("execute", function(e) {
		var input = this.__input.getValue();

		if (input !== "")
		{
		    this.__rrpc.callAsync(this.__sendresult, "JOIN",
					  global_id + " " + global_sec + " " +
					  input + " " + this.__nwselection);
		}
		this.__window.close();
	    }, this);

	    rootItem.add(this.__window);
	    this.__window.open();
	},

	__sendresult : function(result, exc) 
	{
	    if (exc == null) 
	    {

	    } 
	    else 
	    {
		alert("!!! Exception during async call: " + exc);
	    }
	}
    }
});
