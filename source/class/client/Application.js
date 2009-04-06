/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.Application",
{
    extend : qx.application.Standalone,

    members :
    {
	__rpc : 0,
	
	result : function(result, exc) 
	{
	    if (exc == null) {
		alert("Reesult of async call: " + result);
	    } else {
		alert("Exception during async call: " + exc);
	    }
	},

	checkInput : function()
	{
	    this.__effect.start();

	    __rpc.callAsync(this.result, "echo", "Testi");

	},
	
	__prepareEffect : function()
	{
	    this.__effect = new qx.fx.effect.combination.Shake(
		this.__container.getContainerElement().getDomElement());
	},

	main: function()
	{
	    this.base(arguments);
	    
	    __rpc = new qx.io.remote.Rpc(
		"http://moe.portaali.org/rpcperl/jsonrpc.pl",
		"qooxdoo.test"
	    );

	    var layout2 = new qx.ui.layout.VBox();
	    layout2.setSpacing(25); // apply spacing

	    this.__container2 = new qx.ui.container.Composite(layout2);

	    this.__container2.addListener(
		"resize", function(e)
		{
		    var bounds = this.__container2.getBounds();
		    this.__container2.set({
			marginTop: Math.round(-bounds.height / 2),
			marginLeft : Math.round(-bounds.width / 2)
		    });
		}, this); 

	    /* Container layout */
	    var layout = new qx.ui.layout.Grid(9, 5);
	    layout.setColumnAlign(0, "right", "top");
	    layout.setColumnAlign(2, "right", "top");
	    
	    /* Container widget */
	    this.__container = new qx.ui.groupbox.GroupBox("Members:").set({
		contentPadding: [16, 16, 16, 16]
	    });
	    this.__container.setLayout(layout);
	    
	    this.__container2.add(this.__container);
	    this.getRoot().add(this.__container2, {left: "50%", top: "30%"});

	    /* Labels */
	    var labels = ["Name:", "Password:"];
	    for (var i=0; i<labels.length; i++) {
		this.__container.add(new qx.ui.basic.Label(labels[i]).set({
		    allowShrinkX: false,
		    paddingTop: 3
		}), {row: i, column : 0});
	    }
	    
	    /* Text fields */
	    var field1 = new qx.ui.form.TextField();
	    var field2 = new qx.ui.form.PasswordField();

	    this.__container.add(field1.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 0, column : 1});
	    
	    this.__container.add(field2.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 1, column : 1});
	    
	    /* Button */
	    var button1 = this.__okButton =  new qx.ui.form.Button("Login");
	    button1.setAllowStretchX(false);

	    this.__container.add(button1,{ row : 3, column : 1 });
	    
	    /* Check input on click */
	    button1.addListener("execute", this.checkInput, this);

	    /* Button 2 */
	    var wm1 = this.getModalWindow1();
	  
	    var button2 = this.__okButton =  new qx.ui.form.Button("Register!");
	    button2.addListener("execute", wm1.open, wm1); 
	    button2.setAllowStretchX(true); 
	    this.__container2.add(button2);
	    
	    /* Prepare effect as soon as the container is ready */
	    this.__container.addListener("appear", this.__prepareEffect, this);
	},

	getModalWindow1 : function()
	{
	    var wm1 = new qx.ui.window.Window("First Modal Dialog");
	    wm1.setLayout(new qx.ui.layout.Grid(10));
	    wm1.setModal(true);
	    wm1.setAllowMinimize(false);
	    wm1.setAllowMaximize(false);

	    wm1.moveTo(150, 150);
	    this.getRoot().add(wm1);
/*
	    var btn2 = new qx.ui.form.Button("Open Modal Dialog 2", "icon/16/apps/office-calendar.png");
	    wm1.add(btn2);

	    var chkm1 = new qx.ui.form.CheckBox("Modal");
	    chkm1.setChecked(true);
	    wm1.add(chkm1);
*/
/*	    chkm1.addListener("changeChecked", function(e) {
		wm1.setModal(e.getData());
	    })*/

	    /* Labels */
/*	    var l2 = ["Name:", "Password:"];
	    for (var i=0; i<l2.length; i++) {
		wm1.add(new qx.ui.basic.Label(l2[i]).set({
		    allowShrinkX: false,
		    paddingTop: 3
		}), {row: i, column : 0});
	    }
	    */
	    /* Text fields */
	 /*   var f1 = new qx.ui.form.TextField();
	    var f2 = new qx.ui.form.PasswordField();

	    wm1.add(f1.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 0, column : 1});
	    
	    wm1.add(f2.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 1, column : 1});
*/
	    return wm1;
    
	}
    }
});

