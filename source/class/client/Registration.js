/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.Registration",
{
    extend : qx.application.Standalone,

//    extend : qx.core.Object,

    construct : function(rpcref) 
    {
	this.base(arguments);

	this.__myrpc = rpcref;
//	this.__myapp = appref;
    },
    
    members :
    {
	__myrpc : 0,
	__myapp : 0,

	lisaresult : function(result, exc) 
	{
	    if (exc == null) 
	    {
		if (result == 1)
		{
		    loginForm.wm1.close();
		    loginForm.wm2.open();
		}
		else
		{
		    loginForm.wm1.setStatus("Check fields!!!");
		}
	    } 
	    else 
	    {
		alert("Exception during async call: " + exc);
	    }
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
	    var __firstname = new qx.ui.form.TextField();
	    __firstname.setRequired(true);
	    var __lastname = new qx.ui.form.TextField();
	    var __email = new qx.ui.form.TextField();
	    
	    box1.add(__firstname.set({
		allowGrowX: true, paddingTop: 3
	    }), {row: 0, column : 1, colSpan : 2});
	    
	    box1.add(__lastname.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 1, column : 1, colSpan : 2});

	    // Create some radio buttons
	    var __rbMale = new qx.ui.form.RadioButton("Male");
	    var __rbFemale = new qx.ui.form.RadioButton("Female");

	    // Add them to the container
	    box1.add(__rbMale, { row : 2, column : 1 });
	    box1.add(__rbFemale, { row : 2, column : 2 });

	    box1.add(__email.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 3, column : 1, colSpan : 2});

	    // Add all radio buttons to the manager
	    var __manager = new qx.ui.form.RadioGroup(__rbMale, __rbFemale);
 
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
	    var __pw = new qx.ui.form.PasswordField();
	    var __pwagain = new qx.ui.form.PasswordField();
	    
	    box2.add(__pw.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 0, column : 1});
	    
	    box2.add(__pwagain.set({
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
	    var __nick = new qx.ui.form.TextField();
	    
	    box3.add(__nick.set({
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
	    box4.add(button1);
	    
	    // create a checkbox
	    var accepted = new qx.ui.form.CheckBox("Accept Terms Of Use");
	    accepted.setRequired(true);

	    wm1.add(box1); 
	    wm1.add(box2);
	    wm1.add(box3);
	    wm1.add(new qx.ui.core.Spacer(30));
	    wm1.add(accepted);
	    wm1.add(new qx.ui.core.Spacer(30));
	    wm1.add(box4);

	    // create the form manager
	    var manager = new qx.ui.form.validation.Manager();

	    // create a validator function
	    var passwordLengthValidator = function(value, item) {
		var valid = value != null && value.length > 2;
		if (!valid) 
		{
		    item.setInvalidMessage("Please enter a password at with least 6 characters.");
		    return false;
		}

		if(__pw.getValue() == __pwagain.getValue())
		{
		    return true;
		}
		else
		{
		    item.setInvalidMessage("Passwords do not match");
		    return false;
		}
	    }

	    var nickLengthValidator = function(value, item) {
		var valid = value != null && value.length > 2;
		if (!valid) {
		    item.setInvalidMessage("Please enter a nickname at with least 3 characters.");
		}
		return valid;
	    }

	    var userNameValidator = function(value, item) {
		var valid = value != null && value.length > 0;
		if (!valid) 
		{
		    item.setInvalidMessage("Please enter a name.");
		}
		return valid;
	    }

	    manager.add(__firstname, userNameValidator);
	    manager.add(__lastname, userNameValidator);
	    manager.add(__email, qx.util.Validate.email());
	    manager.add(__pw, passwordLengthValidator);
	    manager.add(__pwagain, passwordLengthValidator);
	    manager.add(__nick, nickLengthValidator);
	    manager.add(accepted);

	    button1.addListener("execute", function() {
		// configure the send button
		button1.setEnabled(false);
		button1.setLabel("Validating...");
		manager.validate();

		if (manager.getValid()) 
		{
		    button1.setLabel("Done");

		    var gender = 1;

		    if (__rbFemale.getValue())
		    {
			gender = 0;
		    }

		    this.__myrpc.callAsync(this.lisaresult, "register",
					   __firstname.getValue(), __lastname.getValue(),
					   gender, 			    
					   __email.getValue(), __pw.getValue(), __pwagain.getValue(),
					   __nick.getValue());
		}
		else 
		{
		    button1.setEnabled(true);
		    button1.setLabel("Try again");
		}
	    }, this);

	    return wm1;
	}
    }
});

