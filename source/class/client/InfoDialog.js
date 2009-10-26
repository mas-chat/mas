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
		
	this.__message = new qx.ui.basic.Atom("", "icon/32/status/dialog-error.png");
	
	this.__box = new qx.ui.container.Composite;
	this.__box.setLayout(new qx.ui.layout.HBox(10, "right"));
	
	this.__yesbutton = new qx.ui.form.Button("Yes", "icon/16/actions/dialog-ok.png");
	
	this.__nobutton = new qx.ui.form.Button("No", "icon/16/actions/dialog-cancel.png");
    },

    members :
    {
	//common
	__window : 0,
	__message : 0,
	__box : 0,
	__yesbutton : 0,
	__nobutton : 0,
	__yeslistenerid : 0,

	getLoginFailedWin : function(rootItem)
	{
	    this.__window.add(this.__message);

	    this.__message.setLabel("Wrong email addres and/or password. Please try again.");
	    this.__window.setCaption("Login error");

	    this.__window.add(this.__box);

	    this.__yesbutton.setLabel("OK");
	    this.__box.add(this.__yesbutton);
//	    this.__box.add(this.__nobutton);

	    if (this.__yeslistenerid != 0) {
		this.__yesbutton.removeListener(this.__yeslistenerid);
	    }

	    this.__yeslistenerid = this.__yesbutton.addListener("execute", function(e) {
		this.__window.close();
	    }, this);

	    rootItem.add(this.__window);
	    this.__window.open();
	},

	getJoinNewChannleWin : function(rootItem)
	{


	}

    }
});
