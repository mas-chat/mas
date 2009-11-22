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
	__message : 0,
	__box : 0,
	__box2 : 0,
	__yesbutton : 0,
	__yeslistenerid : 0,
	__input : 0,
	__input2 : 0,
	__combo : 0,
	__rrpc : 0,

	show : function(text, showok, callback)
	{
	    this.__window = new qx.ui.window.Window("");
	    this.__window.setLayout(new qx.ui.layout.VBox(10));
	    this.__window.setModal(true);
	    this.__window.setShowClose(false);
	    this.__window.moveTo(400, 300);
	    
	    this.__message = new qx.ui.basic.Atom("", "");
	    
	    this.__box = new qx.ui.container.Composite;
	    this.__box.setLayout(new qx.ui.layout.HBox(10, "right"));
	    
	    this.__combo = new qx.ui.form.ComboBox();
	    
	    this.__box2 = new qx.ui.container.Composite;
	    this.__box2.setLayout(new qx.ui.layout.HBox(10, "left"));
	    
	    this.__yesbutton = new qx.ui.form.Button(
		"Close", "icon/16/actions/dialog-ok.png");
	    
	    this.__input = new qx.ui.form.TextField("").set({
		maxLength: 25
	    });
	    
	    this.__input2 = new qx.ui.form.TextField("").set({
		maxLength: 25
	    });

	    this.__window.add(this.__message);

	    this.__message.setRich(true);
	    this.__message.setLabel(text);
	    this.__window.setCaption("Info");

	    this.__window.add(this.__box);
	    this.__box.add(this.__yesbutton);
			    
	    this.__yeslistenerid = this.__yesbutton.addListener(
		"execute", function(e) {
		    this.__window.close();
		}, this);
	
	    this.__window.setModal(true);
	    
	    MainScreenObj.desktop.add(this.__window);
	    this.__window.open();
	},

	__sendresult : function(result, exc) 
	{
	    if (exc == null) 
	    {
		var pos = result.search(/ /);
		var command = result.slice(0, pos);
		var param = result.slice(pos+1);

		if (command == "NOK")
		{
		    alert(param);
		}
	    } 
	    else 
	    {
		alert("!!! Exception during async call: " + exc);
	    }
	}
    }
});
