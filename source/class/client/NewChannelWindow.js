/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.NewChannelWindow",
{
    extend : qx.core.Object,

    construct : function(middleContainer)
    {

	// write "socket"
	__srpc = new qx.io.remote.Rpc(
	    "http://evergreen.portaali.org:7070/",
	    "ralph"
	);

	var layout = new qx.ui.layout.Grid();
	layout.setColumnFlex(0, 1); // make row 0 flexible
	layout.setColumnWidth(1, 100); // set with of column 1 to 200 pixel

	var wm1 = new qx.ui.window.Window("Join new channel");
	wm1.setLayout(new qx.ui.layout.VBox());
	wm1.setModal(true);
	wm1.setAllowMinimize(false);
	wm1.setAllowMaximize(false);
	wm1.moveTo(150, 150);
	wm1.setShowStatusbar(true);
	
	/* Labels */
	var labels = ["Channel Name:"];
	for (var i=0; i<labels.length; i++) {
	    wm1.add(new qx.ui.basic.Label(labels[i]).set({
		allowShrinkX: false,
		paddingTop: 3
	    }), {row: i, column : 0});
	}
	
	/* Text fields */
	this.__field1 = new qx.ui.form.TextField();
	
	wm1.add(this.__field1.set({
	    allowGrowX: true, paddingTop: 3
	}), {row: 0, column : 1, colSpan : 2});
		
	
	/* OK Button */
	var button1 =  new qx.ui.form.Button("OK");	
	button1.addListener("execute", this.sendJoin, this);
	
	/* Cancel Button */
	var button2 =  new qx.ui.form.Button("Calcel");	
	button2.addListener("execute", this.hide, this);

	wm1.add(button1);
	wm1.add(button2);

	wm1.center();	
	middleContainer.add(wm1);

	this.__window = wm1;

    },

    members :
    {
        __window : 0,
	__srpc : 0,

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

	sendJoin : function(e)
	{
	    var input = this.__field1.getValue();
	    
	    if (input !== "")
	    {
		__srpc.callAsync(this.sendresult, "JOIN", global_id + " " + global_sec + " " + input);
	    }

	    this.hide();
	},

	show : function()
	{
	    this.__window.open();
    	},

	hide : function()
	{
	    this.__window.close();
    	}


    }
});
