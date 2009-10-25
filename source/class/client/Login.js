/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.Login",
{
    extend : qx.core.Object,

    construct : function(rpcref, appref)
    {
	myapp2 = appref;
        this.__myrpc = rpcref;
    },

    statics :
    {
	COOKIE_KEY : "ProjectEvergreen"
    },

    members :
    {
	wm1 : 0,
        __myrpc : 0,

	result : function(result, exc) 
	{
	    if (exc == null) 
	    {

		var options = result.split(" ");

                global_id = options.shift();
                global_sec = options.shift();
		
		var cookie = options.shift();
		var reason = options.shift();

		//TODO: this is not robuts. Try to send "" from server and you be surprised
 

		if (global_id == 0)
		{
		    if (reason == 0)
		    {
			infoDialog.getLoginFailedWin(__rootItem);
			qx.bom.Cookie.del(client.Login.COOKIE_KEY);
		    }
		    // else do nothing. Cookie is expired and user will see login page
		}
		else
		{
		    if(cookie != 0)
		    {
			// expires after two week or when server says so
			qx.bom.Cookie.set(client.Login.COOKIE_KEY, cookie, 14);
		    }

		    myapp2.loginDone();
		}
	    } 
	    else 
	    {
		alert("Exception during async call: " + exc);
	    }
	},

	checkInput : function()
	{
	    var remember = 0;

	    if(cbRemember.getValue()) {
		remember = 1;
	    }

	    this.__myrpc.callAsync(this.result, "login", this.__field1.getValue(), this.__field2.getValue(), remember);
	},

	show : function(rootItem)
	{

	    /* Layout for root */
	    var realrootLayout = new qx.ui.layout.HBox();
	    realrootContainer = new qx.ui.container.Composite(realrootLayout);
	    realrootLayout.setSpacing(25); // apply spacing

	    /* Layout for root */
	    var rootLayout = new qx.ui.layout.VBox();
	    rootLayout.setSpacing(25); // apply spacing

	    /* Root widget */
	    rootContainer = new qx.ui.container.Composite(rootLayout);

	    /* Layout for members box */
	    var layout = new qx.ui.layout.Grid(9, 5);
	    layout.setColumnAlign(0, "right", "top");
	    layout.setColumnAlign(2, "right", "top");
	    
	    /* Members box widget */
	    this.__box1 = new qx.ui.groupbox.GroupBox("Existing users:").set({
		contentPadding: [16, 16, 16, 16]
	    });
	    this.__box1.setLayout(layout);
	    
	    rootContainer.add(this.__box1);

	    /* Labels */
	    var labels = ["Nick name:", "Password:"];
	    for (var i=0; i<labels.length; i++) {
		this.__box1.add(new qx.ui.basic.Label(labels[i]).set({
		    allowShrinkX: false,
		    paddingTop: 3
		}), {row: i, column : 0});
	    }
	    
	    /* Text fields */
	    this.__field1 = new qx.ui.form.TextField();
	    this.__field2 = new qx.ui.form.PasswordField();

	    this.__box1.add(this.__field1.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 0, column : 1});
	    
	    this.__box1.add(this.__field2.set({
		allowShrinkX: false, paddingTop: 3
	    }), {row: 1, column : 1});
	    
	    /* Button */
	    var button1 = this.__okButton =  new qx.ui.form.Button("Login");
	    button1.setAllowStretchX(false);

	    this.__box1.add(button1,{ row : 3, column : 1 });

	    /* remember me */
	    cbRemember = new qx.ui.form.CheckBox("Remember me");
	    this.__box1.add(cbRemember,{ row : 2, column : 1 });
	    
	    /* Check input on click */
	    button1.addListener("execute", this.checkInput, this);
	    this.__field2.addListener("execute", this.checkInput, this);

	    /* Layout for register box */
            var layout2 = new qx.ui.layout.VBox();

	    /* Register box widget */
	    this.__box2 = new qx.ui.groupbox.GroupBox("New members:").set({
		contentPadding: [16, 16, 16, 16]
	    });
	    this.__box2.setLayout(layout2);

	    this.wm1 = registrationForm.getModalWindow1();
	    rootItem.add(this.wm1);
	    this.wm1.center();

	    this.wm2 = this.getModalWindow2();
	    rootItem.add(this.wm2);

	    /* Button 2 */
	    var button2 = this.__okButton =  new qx.ui.form.Button("Register!");
	    button2.addListener("execute", this.wm1.open, this.wm1); 
	    this.__box2.add(button2);

	    rootContainer.add(this.__box2); 

	    /* frame */
	    var html1 = "<center><h1>Project Evergreen</H1></center><p><br><br><center><img src=\"img/s.gif\"></center><p><br><center>Nothing public yet.</center><p><center>Contact: <a href=\"mailto:iao@iki.fi\">iao@iki.fi</a>";
	    var frame = new qx.ui.embed.Html(html1);
//	    frame.setMaxWidth(900);
	    frame.setDecorator("main");

	    rootItem.add(frame, {
		top : 50,
		right : 50,
		bottom : 50,
		left : 50
	    });

	    rootItem.add(rootContainer, {
		top : 100,
		left : 100
	    });
	},

	getModalWindow2 : function()
	{
	    var wm1 = new qx.ui.window.Window("Registration form");
	    wm1.setLayout(new qx.ui.layout.VBox());
	    wm1.setModal(true);
	    wm1.setAllowMinimize(false);
	    wm1.setAllowMaximize(false);
	    wm1.moveTo(250, 150);

	    var atom = new qx.ui.basic.Atom("Registration OK. Now check your mail to proceed!", "icon/32/apps/office-address-book.png");
	    atom.setRich(true);
	    wm1.add(atom);

	    var btn1 = new qx.ui.form.Button("OK");
	    btn1.addListener("execute", wm1.close, wm1);
	    wm1.add(btn1);

	    return wm1;
    	}

    }
});

