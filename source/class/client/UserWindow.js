/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.UserWindow",
{
    extend : qx.core.Object,

    construct : function(middleContainer, system, name)
    {

	// write "socket"
	__srpc = new qx.io.remote.Rpc(
	    "http://evergreen.portaali.org:7070/",
	    "ralph"
	);

	var layout = new qx.ui.layout.Grid();
	layout.setColumnFlex(0, 1); // make row 0 flexible
	layout.setColumnWidth(1, 100); // set with of column 1 to 200 pixel

	var wm1 = new qx.ui.window.Window(name);
	wm1.setLayout(layout);
	wm1.setModal(false);
	wm1.setAllowMaximize(false);
	wm1.moveTo(250, 150);
	
	// create scroll container
	this.__scroll = new qx.ui.container.Scroll().set({
	    width: 300,
	    height: 200,
	    scrollbarY : "on"
	});

	var channelText = "Ready.<br>";
	
	this.__atom = new qx.ui.basic.Atom(channelText);
	this.__atom.setRich(true);
	
	this.__scroll.add(this.__atom);		       
	wm1.add(this.__scroll, {row: 0, column: 0});
	
	this.__input1 = new qx.ui.form.TextField().set({
	    maxLength: 150
	});
	this.__input1.focus();
	this.__input1.addListener("changeValue", this.getUserText, this);
	wm1.add(this.__input1, {row: 1, column: 0});
	
	if (system == false)
	{
	    wm1.add(this.getList(), {row: 0, column: 1, rowSpan: 3});
	}

	this.__window = wm1;

	middleContainer.add(wm1);
    },

    members :
    {
        __window : 0,
	__input1 : 0,
	__atom : 0,
	__channelText : "",
	__scroll : 0,
	__srpc : 0,
	winid : 0,

	sendresult : function(result, exc) 
	{
	    if (exc == null) 
	    {

	    } 
	    else 
	    {
		alert("!!! Exception during async call: " + exc);
	    }

	},

	show : function()
	{
	    this.__window.open();
    	},

	getUserText : function(e)
	{
	    var input = e.getData();
	    
	    if (input !== "")
	    {
		__srpc.callAsync(this.sendresult, "SEND", "1 1234 " + this.winid + " " + input);
		this.__input1.setValue("");
		this.addline("&lt;foobar&gt; " + input + "<br>");
	    }
	},

	addline : function(line)
	{
	    var sizes = this.__scroll.getItemBottom(this.__atom);
	    this.__channelText = this.__channelText + line;
	    this.__atom.setLabel(this.__channelText);
	    this.__scroll.scrollToY(sizes);
	},

	addnames : function(line)
	{
	    var sizes = this.__scroll.getItemBottom(this.__atom);
	    this.__channelText = this.__channelText + "names: " + line + "<br>";
	    this.__atom.setLabel(this.__channelText);
	    this.__scroll.scrollToY(sizes);
	},

	getList : function()
	{
	    var list = new qx.ui.form.List;
	    list.setContextMenu(this.getContextMenu());

	    for (var i=0; i<20; i++) {
		list.add(new qx.ui.form.ListItem("@user" + i));
	    }

	    return list;
	},

	getContextMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var cutButton = new qx.ui.menu.Button("Info", "icon/16/actions/edit-cut.png", this._cutCommand);
	    var copyButton = new qx.ui.menu.Button("Send Message", "icon/16/actions/edit-copy.png", this._copyCommand);
	    var pasteButton = new qx.ui.menu.Button("De-op", "icon/16/actions/edit-paste.png", this._pasteCommand);

//	    cutButton.addListener("execute", this.debugButton);
//	    copyButton.addListener("execute", this.debugButton);
//	    pasteButton.addListener("execute", this.debugButton);

	    menu.add(cutButton);
	    menu.add(copyButton);
	    menu.add(pasteButton);

	    return menu;
	}
    }
});
