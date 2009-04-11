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

	    gMain.__wm1.setStatus("foo");
	    alert("testtttt:" + this);

//	    this.__effect.start();

	    if (exc == null) 
	    {

		alert("Done");

		if (result == true)
		{
		    this.setStatus("foo");

//		    this.__wm1.setShowStatusbar(true);
//		    this.__wm1.setStatus("OK");
		}
		else
		{
//		    this.__wm1.setShowStatusbar(true);
//		    this.__wm1.setStatus("NOT OK");
		}
	    } 
	    else 
	    {
		alert("Exception during async call: " + exc);
	    }
	},

	checkInput : function()
	{
	    this.__effect.start();

	    __rpc.callAsync(this.result, "echo", "Testi");

	},

	registerUser : function()
	{
	    gMain = this;

	    __rpc.callAsync(this.result, "register", this.__field1.getValue(), this.__field2.getValue(),
			    this.__manager.getValue(), 			    
			    this.__field3.getValue(), this.__field4.getValue(), this.__field5.getValue(), 
			    this.__field6.getValue());
	},
	
	__prepareEffect : function()
	{
	    this.__effect = new qx.fx.effect.combination.Shake(
		this.__box1.getContainerElement().getDomElement());
	},

	main: function()
	{
	    this.base(arguments);
	   
	    __rpc = new qx.io.remote.Rpc(
		"http://evergreen.portaali.org/svn/lisa/jsonrpc.pl",
		"qooxdoo.test"
	    );

	    /* Layout for root */
	    var rootLayout = new qx.ui.layout.VBox();
	    rootLayout.setSpacing(25); // apply spacing

	    /* Root widget */
	    this.rootContainer = new qx.ui.container.Composite(rootLayout);

	    this.rootContainer.addListener(
		"resize", function(e)
		{
		    var bounds = this.rootContainer.getBounds();
		    this.rootContainer.set({
			marginTop: Math.round(-bounds.height / 2),
			marginLeft : Math.round(-bounds.width / 2)
		    });
		}, this); 

	    /* Layout for members box */
	    var layout = new qx.ui.layout.Grid(9, 5);
	    layout.setColumnAlign(0, "right", "top");
	    layout.setColumnAlign(2, "right", "top");
	    
	    /* Members box widget */
	    this.__box1 = new qx.ui.groupbox.GroupBox("Existing users:").set({
		contentPadding: [16, 16, 16, 16]
	    });
	    this.__box1.setLayout(layout);
	    
	    this.rootContainer.add(this.__box1);

	    /* Labels */
	    var labels = ["Name:", "Password:"];
	    for (var i=0; i<labels.length; i++) {
		this.__box1.add(new qx.ui.basic.Label(labels[i]).set({
		    allowShrinkX: false,
		    paddingTop: 3
		}), {row: i, column : 0});
	    }
	    
	    /* Text fields */
	    var field1 = new qx.ui.form.TextField();
	    var field2 = new qx.ui.form.PasswordField();

	    this.__box1.add(field1.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 0, column : 1});
	    
	    this.__box1.add(field2.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 1, column : 1});
	    
	    /* Button */
	    var button1 = this.__okButton =  new qx.ui.form.Button("Login");
	    button1.setAllowStretchX(false);

	    this.__box1.add(button1,{ row : 3, column : 1 });
	    
	    /* Check input on click */
	    button1.addListener("execute", this.checkInput, this);

	    /* Layout for register box */
            var layout2 = new qx.ui.layout.VBox();

	    /* Register box widget */
	    this.__box2 = new qx.ui.groupbox.GroupBox("New members:").set({
		contentPadding: [16, 16, 16, 16]
	    });
	    this.__box2.setLayout(layout2);

	    /* Button 2 */
	    this.__wm1 = this.getModalWindow1();

	    var button2 = this.__okButton =  new qx.ui.form.Button("Register!");
	    button2.addListener("execute", this.__wm1.open, this.__wm1); 
	    button2.setAllowStretchX(true); 
	    this.__box2.add(button2);
	    
	    /* Prepare effect as soon as the container is ready */
	    this.__box1.addListener("appear", this.__prepareEffect, this);

	    this.rootContainer.add(this.__box2); 
	    this.getRoot().add(this.rootContainer, {left: "50%", top: "30%"});	    
	},

	getModalWindow1 : function()
	{
	    var wm1 = new qx.ui.window.Window("Registration form");
	    wm1.setLayout(new qx.ui.layout.VBox());
	    wm1.setModal(true);
	    wm1.setAllowMinimize(false);
	    wm1.setAllowMaximize(false);
	    wm1.moveTo(150, 150);
	    wm1.setShowStatusbar(true);

	    /* Layout for basic info box */
	    var layout = new qx.ui.layout.Grid(9, 5);
	    layout.setColumnAlign(0, "right", "top");
	    layout.setColumnAlign(2, "right", "top");
	    
	    /* Info box widget */
	    var box1 = new qx.ui.groupbox.GroupBox("Basic information:").set({
		contentPadding: [16, 16, 16, 16]
	    });
	    box1.setLayout(layout);

	    /* Labels */
	    var labels = ["First Name:", "Last Name:", "Gender:", "Email:"];
	    for (var i=0; i<labels.length; i++) {
		box1.add(new qx.ui.basic.Label(labels[i]).set({
		    allowShrinkX: false,
		    paddingTop: 3
		}), {row: i, column : 0});
	    }
	    
	    /* Text fields */
	    this.__field1 = new qx.ui.form.TextField();
	    this.__field2 = new qx.ui.form.TextField();
	    this.__field3 = new qx.ui.form.TextField();
	    
	    box1.add(this.__field1.set({
		allowGrowX: true, paddingTop: 3
	    }), {row: 0, column : 1, colSpan : 2});
	    
	    box1.add(this.__field2.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 1, column : 1, colSpan : 2});

	    // Create some radio buttons
	    this.__rbMale = new qx.ui.form.RadioButton("Male");
	    this.__rbFemale = new qx.ui.form.RadioButton("Female");

	    // Add them to the container
	    box1.add(this.__rbMale, { row : 2, column : 1 });
	    box1.add(this.__rbFemale, { row : 2, column : 2 });

	    box1.add(this.__field3.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 3, column : 1, colSpan : 2});

	    // Add all radio buttons to the manager
	    this.__manager = new qx.ui.form.RadioGroup(this.__rbMale, this.__rbFemale);
 
	    /* Layout for password box */
	    var layout2 = new qx.ui.layout.Grid(9, 5);
	    layout2.setColumnAlign(0, "right", "top");
	    layout2.setColumnAlign(2, "right", "top");
	    
	    /* Password box widget */
	    var box2 = new qx.ui.groupbox.GroupBox("Password:").set({
		contentPadding: [16, 16, 16, 16]
	    });
	    box2.setLayout(layout2);

	    /* Labels */
	    var labels = ["Password:", "Password again:"];
	    for (var i=0; i<labels.length; i++) {
		box2.add(new qx.ui.basic.Label(labels[i]).set({
		    allowShrinkX: false,
		    paddingTop: 3
		}), {row: i, column : 0});
	    }
	    
	    /* Text fields */
	    this.__field4 = new qx.ui.form.PasswordField();
	    this.__field5 = new qx.ui.form.PasswordField();
	    
	    box2.add(this.__field4.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 0, column : 1});
	    
	    box2.add(this.__field5.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 1, column : 1});
	
	    /* Layout for nick box */
	    var layout3 = new qx.ui.layout.Grid(9, 5);
	    layout3.setColumnAlign(0, "right", "top");
	    layout3.setColumnAlign(2, "right", "top");
	    
	    /* Nick box widget */
	    var box3 = new qx.ui.groupbox.GroupBox("Nick name:").set({
		contentPadding: [16, 16, 16, 16]
	    });
	    box3.setLayout(layout3);

	    /* Labels */
	    box3.add(new qx.ui.basic.Label("Nick name:").set({
		allowShrinkX: false,
		paddingTop: 3
	    }), {row: 0, column : 0});
	    
	    /* Text fields */
	    this.__field6 = new qx.ui.form.TextField();
	    
	    box3.add(this.__field6.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 0, column : 1});

	    /* Layout for send box */
	    var layout4 = new qx.ui.layout.VBox();
	    
	    /* Send box widget */
	    var box4 = new qx.ui.groupbox.GroupBox().set({
		contentPadding: [10, 10, 10, 10]
	    });
	    box4.setLayout(layout4);
	
	    /* Button */
	    var button1 =  new qx.ui.form.Button("Complete registration");
	    
	    /* Check input on click */
	    button1.addListener("execute", this.registerUser, this);
	    
	    box4.add(button1);
	    
	    wm1.add(box1); 
	    wm1.add(box2);
	    wm1.add(box3);
	    wm1.add(new qx.ui.core.Spacer(30));
	    wm1.add(box4);

	    this.getRoot().add(wm1);

	    return wm1;
    
	}
    }
});

