/* ************************************************************************

#asset(projectx/*)

************************************************************************ */

qx.Class.define("client.MainScreen",
{
    extend : qx.core.Object,

    construct : function(rpcref, appref)
    {
	myapp2 = appref;
        this.__myrpc = rpcref;
    },

    members :
    {
        __myrpc : 0,
	__input1 : 0,
	__atom : 0,
	__channelText : "",
	__scroll : 0,
	
	show : function(rootItem)
	{
	    /* Layout for root */
	    var rootLayout = new qx.ui.layout.Canvas();

	    /* Root widget */
	    var rootContainer = new qx.ui.container.Composite(rootLayout);

	    var bounds = rootContainer.getBounds();

	    rootContainer.add(this.getMenuBar(bounds), {left:"3%", top:"3%", right:"3%", width:"20%" });

	    /* middle */
	    var middleContainer = new qx.ui.container.Composite();
	    rootContainer.add(middleContainer,  {left:"3%", bottom:"40%", right:"3%", width:"20%" });
	    
	    // create the toolbar
	    toolbar = new qx.ui.toolbar.ToolBar();
	    toolbar.set({ maxHeight : 40 });

	    // create and add Part 1 to the toolbar
	    var part1 = new qx.ui.toolbar.Part();
	    var newButton = new qx.ui.toolbar.Button("Join new channel..", "icon/22/actions/document-new.png");
	    var copyButton = new qx.ui.toolbar.Button("#parkano", "icon/22/actions/edit-copy.png");
	    var cutButton = new qx.ui.toolbar.Button("wilma", "icon/22/actions/edit-cut.png");
	    var pasteButton = new qx.ui.toolbar.Button("#suomi", "icon/22/actions/edit-paste.png");

	    part1.add(newButton);
	    part1.add(new qx.ui.toolbar.Separator());
	    part1.add(copyButton);
	    part1.add(cutButton);
	    part1.add(pasteButton);
	    toolbar.add(part1);

	    rootContainer.add(toolbar, {left:"3%", bottom:"3%", right:"3%", width:"20%" });

	    this.wm3 = this.getModalWindow3();
	    rootContainer.add(this.wm3);
	    this.wm3.open();

	    rootItem.add(rootContainer, {edge : 0});	    
	},

	getMenuBar : function(bounds)
	{
	    var frame = new qx.ui.container.Composite(new qx.ui.layout.Grow);

	    var menubar = new qx.ui.menubar.MenuBar;
//	    menubar.setWidth(bounds.width);
	    menubar.setAllowGrowX(true);

	    frame.add(menubar);

	    var fileMenu = new qx.ui.menubar.Button("File", null, this.getFileMenu());
	    var editMenu = new qx.ui.menubar.Button("Edit", null, this.getEditMenu());
	    var searchMenu = new qx.ui.menubar.Button("Search", null, this.getSearchMenu());
	    var viewMenu = new qx.ui.menubar.Button("View", null, this.getViewMenu());
	    var formatMenu = new qx.ui.menubar.Button("Format", null, this.getFormatMenu());
	    var helpMenu = new qx.ui.menubar.Button("Help", null, this.getHelpMenu());

	    menubar.add(fileMenu);
	    menubar.add(editMenu);
	    menubar.add(searchMenu);
	    menubar.add(viewMenu);
	    menubar.add(formatMenu);
	    menubar.add(helpMenu);

	    return frame;
	},

	getModalWindow3 : function()
	{
	    var wm1 = new qx.ui.window.Window("Main Window - Moe v0.01");
	    wm1.setLayout(new qx.ui.layout.VBox());
	    wm1.setModal(false);
//	    wm1.setAllowResize(true);
	    wm1.setAllowMaximize(false);
	    wm1.moveTo(250, 150);

	    // create scroll container
	    __scroll = new qx.ui.container.Scroll().set({
		width: 300,
		height: 200,
		scrollbarY : "on"
	    });
	    
	    __channelText = "Welcome to evergreen<br>Ready.<br>";

	    __atom = new qx.ui.basic.Atom(__channelText);
	    __atom.setRich(true);
	    wm1.add(__atom);

	    __scroll.add(__atom);		       
	    wm1.add(__scroll);

	    __input1 = new qx.ui.form.TextField().set({
		maxLength: 150
	    });
	    __input1.focus();
	    __input1.addListener("changeValue", this.getUserText, this);
	    wm1.add(__input1);

	    return wm1;
    	},

	getUserText : function(e)
	{
	    var input = e.getData();
	    
	    if (input !== "")
	    {
		var sizes = __scroll.getItemBottom(__atom);

		this.debug("ChangeValue: " + input);
		this.debug("s: " + sizes);
		__input1.setValue("");
		__channelText = __channelText + "&lt;ilkka&gt; " + input + "<br>";
		__atom.setLabel(__channelText);
		__scroll.scrollToY(sizes);
	    }
	},

	getFileMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var newButton = new qx.ui.menu.Button("New", "icon/16/actions/document-new.png", this._newCommand);
	    var openButton = new qx.ui.menu.Button("Open", "icon/16/actions/document-open.png", this._openCommand);
	    var closeButton = new qx.ui.menu.Button("Close");
	    var saveButton = new qx.ui.menu.Button("Save", "icon/16/actions/document-save.png", this._saveCommand);
	    var saveAsButton = new qx.ui.menu.Button("Save as...", "icon/16/actions/document-save-as.png");
	    var printButton = new qx.ui.menu.Button("Print", "icon/16/actions/document-print.png");
	    var exitButton = new qx.ui.menu.Button("Exit", "icon/16/actions/application-exit.png");

	    newButton.addListener("execute", this.debugButton);
	    openButton.addListener("execute", this.debugButton);
	    closeButton.addListener("execute", this.debugButton);
	    saveButton.addListener("execute", this.debugButton);
	    saveAsButton.addListener("execute", this.debugButton);
	    printButton.addListener("execute", this.debugButton);
	    exitButton.addListener("execute", this.debugButton);

	    menu.add(newButton);
	    menu.add(openButton);
	    menu.add(closeButton);
	    menu.add(saveButton);
	    menu.add(saveAsButton);
	    menu.add(printButton);
	    menu.add(exitButton);

	    return menu;
	},

	getEditMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var undoButton = new qx.ui.menu.Button("Undo", "icon/16/actions/edit-undo.png", this._undoCommand);
	    var redoButton = new qx.ui.menu.Button("Redo", "icon/16/actions/edit-redo.png", this._redoCommand);
	    var cutButton = new qx.ui.menu.Button("Cut", "icon/16/actions/edit-cut.png", this._cutCommand);
	    var copyButton = new qx.ui.menu.Button("Copy", "icon/16/actions/edit-copy.png", this._copyCommand);
	    var pasteButton = new qx.ui.menu.Button("Paste", "icon/16/actions/edit-paste.png", this._pasteCommand);

	    undoButton.addListener("execute", this.debugButton);
	    redoButton.addListener("execute", this.debugButton);
	    cutButton.addListener("execute", this.debugButton);
	    copyButton.addListener("execute", this.debugButton);
	    pasteButton.addListener("execute", this.debugButton);

	    menu.add(undoButton);
	    menu.add(redoButton);
	    menu.addSeparator();
	    menu.add(cutButton);
	    menu.add(copyButton);
	    menu.add(pasteButton);

	    return menu;
	},

	getSearchMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var searchButton = new qx.ui.menu.Button("Search...", "icon/16/actions/system-search.png");
	    var nextButton = new qx.ui.menu.Button("Search next...");
	    var previousButton = new qx.ui.menu.Button("Search previous...");
	    var replaceButton = new qx.ui.menu.Button("Replace");
	    var searchFilesButton = new qx.ui.menu.Button("Search in files", "icon/16/actions/system-search.png");
	    var replaceFilesButton = new qx.ui.menu.Button("Replace in files");

	    previousButton.setEnabled(false);

	    searchButton.addListener("execute", this.debugButton);
	    nextButton.addListener("execute", this.debugButton);
	    previousButton.addListener("execute", this.debugButton);
	    replaceButton.addListener("execute", this.debugButton);
	    searchFilesButton.addListener("execute", this.debugButton);
	    replaceFilesButton.addListener("execute", this.debugButton);

	    menu.add(searchButton);
	    menu.add(nextButton);
	    menu.add(previousButton);
	    menu.add(replaceButton);
	    menu.addSeparator();
	    menu.add(searchFilesButton);
	    menu.add(replaceFilesButton);

	    return menu;
	},

	getViewMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var panesButton = new qx.ui.menu.Button("Panes", null, null, this.getPanesMenu());
	    var syntaxButton = new qx.ui.menu.Button("Syntax", null, null, this.getSyntaxMenu());
	    var rulerButton = new qx.ui.menu.CheckBox("Show ruler");
	    var numbersButton = new qx.ui.menu.CheckBox("Show line numbers");
	    var asciiButton = new qx.ui.menu.Button("ASCII table");

	    rulerButton.addListener("changeChecked", this.debugCheckBox);
	    numbersButton.addListener("changeChecked", this.debugCheckBox);
	    asciiButton.addListener("execute", this.debugButton);

	    menu.add(panesButton);
	    menu.add(syntaxButton);
	    menu.addSeparator();
	    menu.add(rulerButton);
	    menu.add(numbersButton);
	    menu.addSeparator();
	    menu.add(asciiButton);

	    return menu;
	},

	getPanesMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var tabsCheckbox = new qx.ui.menu.CheckBox("Show tabs");
	    var statusCheckbox = new qx.ui.menu.CheckBox("Show status bar");

	    var treeCheckbox = new qx.ui.menu.CheckBox("Show tree");
	    var macroCheckbox = new qx.ui.menu.CheckBox("Show macros");
	    var tagCheckbox = new qx.ui.menu.CheckBox("Show tags");
	    var consoleCheckbox = new qx.ui.menu.CheckBox("Show console");

	    tabsCheckbox.setChecked(true);
	    statusCheckbox.setChecked(true);
	    macroCheckbox.setChecked(true);

	    tabsCheckbox.addListener("changeChecked", this.debugCheckBox);
	    statusCheckbox.addListener("changeChecked", this.debugCheckBox);
	    treeCheckbox.addListener("changeChecked", this.debugCheckBox);
	    macroCheckbox.addListener("changeChecked", this.debugCheckBox);
	    tagCheckbox.addListener("changeChecked", this.debugCheckBox);
	    consoleCheckbox.addListener("changeChecked", this.debugCheckBox);

	    menu.add(statusCheckbox);
	    menu.add(tabsCheckbox);
	    menu.addSeparator();
	    menu.add(treeCheckbox);
	    menu.add(macroCheckbox);
	    menu.add(tagCheckbox);
	    menu.add(consoleCheckbox);

	    return menu;
	},

	getSyntaxMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var htmlButton = new qx.ui.menu.RadioButton("HTML");
	    var xmlButton = new qx.ui.menu.RadioButton("XML");
	    var jsButton = new qx.ui.menu.RadioButton("JavaScript");
	    var cdialectButton = new qx.ui.menu.Button("C Dialect", null, null, this.getSyntaxCMenu());
	    var perlButton = new qx.ui.menu.RadioButton("Perl");
	    var pythonButton = new qx.ui.menu.RadioButton("Python");

	    menu.add(htmlButton);
	    menu.add(xmlButton);
	    menu.add(jsButton);
	    menu.add(cdialectButton);
	    menu.add(perlButton);
	    menu.add(pythonButton);

      // Configure and fill radio group
	    var langGroup = new qx.ui.form.RadioGroup;
	    langGroup.add(htmlButton, xmlButton, jsButton, perlButton, pythonButton);
	    langGroup.add.apply(langGroup, cdialectButton.getMenu().getChildren());

	    langGroup.addListener("changeSelected", this.debugRadio);

	    return menu;
	},

	getSyntaxCMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var cButton = new qx.ui.menu.RadioButton("C");
	    var csharpButton = new qx.ui.menu.RadioButton("C Sharp");
	    var objcButton = new qx.ui.menu.RadioButton("Objective C");
	    var cplusButton = new qx.ui.menu.RadioButton("C Plus Plus");

	    menu.add(cButton);
	    menu.add(csharpButton);
	    menu.add(objcButton);
	    menu.add(cplusButton);

	    return menu;
	},

	getFormatMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var paragraphButton = new qx.ui.menu.Button("Paragraph", null, null, this.getParagraphMenu());
	    var spacesButton = new qx.ui.menu.Button("Tabs to spaces");
	    var tabsButton = new qx.ui.menu.Button("Spaces to tabs");
	    var upperButton = new qx.ui.menu.Button("Uppercase");
	    var lowerButton = new qx.ui.menu.Button("Lowercase");
	    var capitalsButton = new qx.ui.menu.Button("Capitals");
	    var ansiButton = new qx.ui.menu.Button("OEM to ANSI");
	    var oemButton = new qx.ui.menu.Button("ANSI to OEM");

	    spacesButton.addListener("execute", this.debugButton);
	    tabsButton.addListener("execute", this.debugButton);
	    upperButton.addListener("execute", this.debugButton);
	    lowerButton.addListener("execute", this.debugButton);
	    capitalsButton.addListener("execute", this.debugButton);
	    ansiButton.addListener("execute", this.debugButton);
	    oemButton.addListener("execute", this.debugButton);

	    menu.add(paragraphButton)
	    menu.add(spacesButton);
	    menu.add(tabsButton);
	    menu.addSeparator();
	    menu.add(upperButton);
	    menu.add(lowerButton);
	    menu.add(capitalsButton);
	    menu.addSeparator();
	    menu.add(ansiButton);
	    menu.add(oemButton);

	    return menu;
	},

	getParagraphMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var leftButton = new qx.ui.menu.Button("Left aligned", "icon/16/actions/format-justify-left.png");
	    var rightButton = new qx.ui.menu.Button("Right aligned", "icon/16/actions/format-justify-right.png");
	    var centeredButton = new qx.ui.menu.Button("Centered", "icon/16/actions/format-justify-center.png");
	    var justifyButton = new qx.ui.menu.Button("Justified", "icon/16/actions/format-justify-fill.png");

	    leftButton.addListener("execute", this.debugButton);
	    rightButton.addListener("execute", this.debugButton);
	    centeredButton.addListener("execute", this.debugButton);
	    justifyButton.addListener("execute", this.debugButton);

	    menu.add(leftButton);
	    menu.add(rightButton);
	    menu.add(centeredButton);
	    menu.add(justifyButton);

	    return menu;
	},

	getHelpMenu : function()
	{
	    var menu = new qx.ui.menu.Menu;

	    var topicsButton = new qx.ui.menu.Button("Topics", "icon/16/apps/utilities-help.png");
	    var quickButton = new qx.ui.menu.Button("Quickstart");
	    var onlineButton = new qx.ui.menu.Button("Online Forum");
	    var infoButton = new qx.ui.menu.Button("Info...");

	    topicsButton.addListener("execute", this.debugButton);
	    quickButton.addListener("execute", this.debugButton);
	    onlineButton.addListener("execute", this.debugButton);
	    infoButton.addListener("execute", this.debugButton);

	    menu.add(topicsButton);
	    menu.add(quickButton);
	    menu.addSeparator();
	    menu.add(onlineButton);
	    menu.addSeparator();
	    menu.add(infoButton);

	    return menu;
	}
    }
});

