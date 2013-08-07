
qx.Class.define("client.UserWindow",
{
    extend : qx.core.Object,

    construct : function(srpc, desktop, topic, nw, name, type, sound, titlealert,
                         nw_id, usermode, password, new_msgs, infoDialog, id, mainscreen)
    {
        this.base(arguments);

        this.__urllist = new Array();
        this.nameslist = new qx.data.Array();
        this.rpc = srpc;
        this.mainscreen = mainscreen;
        this.infoDialog = infoDialog;
        this.winid = id;

        var layout = new qx.ui.layout.Grid();
        layout.setRowFlex(0, 1); // make row 0 flexible
        layout.setColumnFlex(0, 1); // make column 0 flexible
        layout.setColumnWidth(1, 105); // set with of column 1 to 200 pixel
        layout.setColumnAlign(1, "center", "middle");

        var wm1 = new qx.ui.window.Window();
        wm1.userWindowRef = this;

        this.__nw = nw;
        this.__nw_id = nw_id;
        this.sound = sound;
        this.titlealert = titlealert;
        this.__usermode = usermode;
        this.__password = password;
        this.__newmsgsatstart = new_msgs;

        wm1.setModal(false);
        wm1.setLayout(new qx.ui.layout.VBox(0));
        wm1.setAllowMaximize(true);
        wm1.setResizeSensitivity(10);
        wm1.set({contentPadding: [0,0,0,0]});

        if (this.mainscreen.anon_user == true) {
            wm1.setShowClose(false);
        }

        this.__box = new qx.ui.container.Composite(layout);
        this.__box.set({padding:10, margin: 0});

        if (type == 0) {
            this.__box.set({backgroundColor: "#F2F3FC"});
        } else {
            this.__box.set({backgroundColor: "#F7FAC9"});
        }

        wm1.add(this.__box, {flex:1});

        // create scroll container
        this.__scroll = new client.Scroll();

        this.__scroll.addListener("scrollLock", function(e) {

            var caption = this.window.getCaption();

            if (e.getData() == true) {
                this.window.setCaption("[SCROLL LOCK] " + caption);
                this.scrollLock = true;
            } else {
                this.window.setCaption(caption.replace(/^\[SCROLL LOCK\] /, ""));
                this.scrollLock = false;
            }
        }, this);

        this.__scroll.set({
            minWidth: 100,
            minHeight: 50,
            scrollbarY : "on"
        });

        this.__textcomposite = new qx.ui.container.Composite(new qx.ui.layout.VBox(2));
        this.__ntftooltip = new qx.ui.tooltip.ToolTip("Double-click to close this notification.");

        this.__atom = new qx.ui.basic.Label("Please wait...<br>").set({
            rich: true, selectable: true, nativeContextMenu : true});

        if (type == 0) {
            this.__atom.set({backgroundColor: "#F2F5FE"});
        } else {
            this.__atom.set({backgroundColor: "#F7FAC9"});
        }

        this.__scroll.add(this.__atom);

        this.__textcomposite.add(this.__scroll, {flex: 1});

        this.__box.add(this.__textcomposite, {row: 0, column: 0});

        this.__inputline = new qx.ui.form.TextField();
        this.__inputline.set({ maxLength: 400 });
        this.__inputline.setMarginTop(2);
        this.__inputline.focus();

        var searchstart = 0;
        var searchstring = "";
        var extendedsearch = false;

        this.__inputline.addListener("keydown", function(e) {
            var key = e.getKeyIdentifier();

            if (key == "Enter") {
                client.debug.print("enter pressed");

                var input = this.__inputline.getValue();
                if (input !== "" && input !== null) {
                    this.rpc.call("SEND", this.winid + " " + input);
                    this.__inputline.setValue("");

                    input = input.replace(/</g, "&lt;");
                    input = input.replace(/>/g, "&gt;");

                    if (input.substr(0,1) == "/" && input.substr(0,4) != "/me ") {
                        //do nothing
                    } else {
                        var currentTime = new Date();
                        var hour = currentTime.getHours();
                        var min = currentTime.getMinutes();

                        if (min < 10) {
                            min = "0" + min;
                        }

                        if (hour < 10) {
                            hour = "0" + hour;
                        }

                        var mynick = " <font color=\"blue\"><b>&lt;" +
                            this.mainscreen.nicks[this.__nw_id] + "&gt;</b> ";

                        if (input.substr(0,4) == "/me ") {
                            input = input.substr(4);
                            mynick = " <font color=\"blue\"><b>* " +
                                this.mainscreen.nicks[this.__nw_id] + "</b> ";
                        }

                        this.addline(hour + ":" + min + mynick + this.linkify(input) +
                                     "</font><br><!-- x -->");
                    }
                }
                this.setNormal();
            } else if (key == "PageUp") {
                this.__scroll.scrollByY((this.__scroll.getHeight() - 30) * - 1);
            }
            else if (key == "PageDown") {
                this.__scroll.scrollByY(this.__scroll.getHeight() - 30);
            } else if (key == "Down") {
                this.mainscreen.activateNextWin("down");
            } else if (key == "Up") {
                this.mainscreen.activateNextWin("up");
            } else if (key == "Tab" && this.type == 0) {
                var input2 = this.__inputline.getValue();

                if (input2 == null) {
                    input2 = "";
                }

                if (input2.length == 0 || input2.search(/^\S+\s*$/) != -1) {
                    if (extendedsearch == false) {
                        extendedsearch = true;
                        searchstring = input2;
                    }

                    var found = false;

                    for (var i=searchstart; i < this.nameslist.getLength(); i++) {
                        var name = this.nameslist.getItem(i).getName();

                        if (name.substr(0, searchstring.length).toLowerCase() ==
                            searchstring.toLowerCase()) {
                            this.__inputline.setValue(name + ": ");
                            this.__inputline.setTextSelection(100,100);
                            searchstart = i + 1;
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        searchstart = 0;
                    }
                }

                e.stopPropagation();
                e.preventDefault();
            }

            if (key != "Tab") {
                searchstart = 0;
                searchstring = "";
                extendedsearch = false;
            }

        }, this);

        var icomposite = new qx.ui.container.Composite(new qx.ui.layout.HBox(5));
        icomposite.add(this.__inputline, { flex : 1 });

        this.__box.add(icomposite, {row: 1, column: 0});

        this.prefButton = new qx.ui.form.ToggleButton("Settings");
        this.urlButton = new qx.ui.form.ToggleButton("L");

        this.prefButton.setFocusable(false);
        this.urlButton.setFocusable(false);

        this.prefButton.setMargin(2,5,2,5);
        this.urlButton.setMargin(2,5,2,5);

        var buttons = new qx.ui.container.Composite(
            new qx.ui.layout.HBox(0));

        buttons.add(this.prefButton);
        buttons.add(this.urlButton);

        if (type == 0) {
            this.__box.add(this.getList(), {row: 0, column: 1, flex:1});
            this.__box.add(buttons, {row: 1, column: 1});
        } else {
            icomposite.add(buttons);
        }

        this.window = wm1;
        this.type = type;
        this.__name = name;
        this.__settings = this.getSettingsView();
        this.__urls = this.getUrlsView();

        this.prefButton.addListener("changeValue", function(e) {
            if (e.getData() == true) {
                this.urlButton.setEnabled(false);

                this.topicInput.setValue(this.__topic);
                this.pwInput.setValue(this.__password);

                if (this.__usermode == 2) {
                    this.configListOper.removeAll();
                    this.configListOper.add(new qx.ui.form.ListItem("Refreshing..."));

                    this.rpc.call("GETOPERS", this.winid);
                }

                if (this.__usermode != 0) {
                    this.configListBan.removeAll();
                    this.configListBan.add(new qx.ui.form.ListItem("Refreshing..."));

                    this.rpc.call("GETBANS", this.winid);
                }

                this.__box.remove(this.__textcomposite);
                if (this.type == 0) {
                    this.__box.remove(this.__list);
                    this.__box.add(this.__settings, {row : 0, column : 0, colSpan : 2 });
                } else {
                    this.__box.add(this.__settings, {row : 0, column : 0});
                }

                this.__viewmode = 1;
            } else {
                this.getBackFromSettingsMode();
            }
        }, this);

        this.urlButton.addListener("changeValue", function(e) {
            if (e.getData() == true) {
                this.prefButton.setEnabled(false);
                this.updateUrls();

                this.__box.remove(this.__textcomposite);
                if (this.type == 0) {
                    this.__box.remove(this.__list);
                    this.__box.add(this.__urls, {row : 0, column : 0, colSpan : 2 });
                } else {
                    this.__box.add(this.__urls, {row : 0, column : 0 });
                }

                this.__viewmode = 2;
            } else {
                this.getBackFromUrlMode();
            }
        }, this);

        desktop.add(wm1);

        this.changetopic(topic);
    },

    //TODO: write proper destructor
    members :
    {
        window : 0,
        hidden : false,
        winid : 0,
        rpc : 0,
        taskbarControl : 0,
        titlealert : 0,
        sound : 0,
        configListBan : 0,
        configListOper : 0,
        nameslist : null,
        closeok : 0,
        scrollLock : false,
        isRed : false,
        infoDialog : 0,
        mainscreen : 0,
        type : 0,
        apikey : 0,

        __notes : 0,
        __inputline : 0,
        __urllabel : 0,
        __list : 0,
        __atom : 0,
        __channelText : "",
        __scroll : 0,
        __lines : 0,
        __settings : 0,
        __urls : 0,
        __viewmode : 0,
        __box : 0,
        __nw : 0,
        __nw_id : 0,
        __topic : 0,
        __taskbarButtonColor : "cccccc",
        __name : 0,
        __password : 0,
        __usermode : 0,
        __newmsgsatstart : 0,
        __urllist : null,
        __ntftooltip : 0,
        __textcomposite : 0,

        updateValues : function(topic, nw, name, type, sound, titlealert,
                                nw_id, usermode, password)
        {
            this.__password = password;
            this.__usermode = usermode;
            this.__topic = topic;
            this.__name = name;

            //show potential name or topic change
            this.changetopic(topic);

            if (this.__viewmode == 1) {
                //realtime update
                this.topicInput.setValue(this.__topic);
                this.pwInput.setValue(this.__password);
            }
        },

        handleResize : function(e)
        {
            var data = e.getData();
            var width = data.width;
            var height = data.height;

            if (this.mainscreen.initdone == 1) {
                this.rpc.call("RESIZE", this.winid + " " + width + " " + height);
            }
        },

        handleClose : function(e)
        {
            this.rpc.call("CLOSE", this.winid);
            client.debug.print("works");

            qx.event.Timer.once(function(e) {
                if (this.mainscreen.settings.getAutoArrange() == 1) {
                    this.mainscreen.arrangeCommand();
                }
            }, this, 1000);
            client.debug.print("works2");
        },

        //TODO: handle beforeclose -> remove from mainscreen array

        setHeight : function(e)
        {
            this.window.setHeight(e);
        },

        setWidth : function(e)
        {
            this.window.setWidth(e);
        },

        getBounds : function()
        {
            return this.window.getBounds();
        },

        setRed : function()
        {
            this.__taskbarButtonColor = "ff1111";
            this.updateButton();
            this.isRed = true;
        },

        setGreen : function()
        {
            this.__taskbarButtonColor = "007700";
            this.updateButton();
            this.isRed = false;
        },

        setNormal : function()
        {
            this.__taskbarButtonColor = "000000";
            this.updateButton();
            this.isRed = false;

            if (this.__newmsgsatstart != 0) {
                this.__newmsgsatstart = 0;
                this.rpc.call("SEEN", this.winid);
            }
        },

        updateButton : function()
        {
            var name = this.getName();

            if (this.type == 0 && this.__nw_id == 0) {
                name = name.substr(1);
                name = name.substr(0, 1).toUpperCase() + name.substr(1);
            }

            this.taskbarButton.setLabel("<span style=\"color:#" +
                                        this.__taskbarButtonColor + "\">" + name +
                                        "</span>&nbsp;<span style=\"color:#339933\">"
                                        + (this.hidden == true ? "M" : "&nbsp;") +
                                        "</span>");
        },

        handleMove : function(e)
        {
            var data = e.getData();
            var x = data.left;
            var y = data.top;

            if (this.mainscreen.initdone == 1) {
                this.rpc.call("MOVE", this.winid + " " + x + " " + y);
            }
        },

        handleMinimize : function(e)
        {
            this.hidden = true;
            this.updateButton();

            if (this.mainscreen.initdone == 1) {
                this.rpc.call("HIDE", this.winid);
            }
        },

        handleRestore : function(e)
        {
            this.hidden = false;
            this.updateButton();

            if (this.mainscreen.initdone == 1) {
                this.rpc.call("REST", this.winid);
            }
        },

        setFonts : function(large)
        {

            if (large == 1) {
                this.__atom.setFont("defaultlarge");
                this.__inputline.setFont("defaultlarge");
            } else {
                this.__atom.setFont("default");
                this.__inputline.setFont("default");
            }

            this.__scroll.scrollToY(200000);
        },

        activatewin : function()
        {
            this.window.activate();

            if (this.__viewmode == 0) {
//              this.__inputline.focus();
            }
        },

        addHandlers : function()
        {
            this.window.addListener('resize', this.handleResize, this);
            this.window.addListener('move', this.handleMove, this);
            this.window.addListener('minimize', this.handleMinimize, this);
            this.window.addListener('appear', this.handleRestore, this);

            this.window.addListener('click', function(e) {

                if (this.taskbarControl) {
                    this.taskbarControl.setSelection([this.taskbarButton]);
                }
                //this.activatewin();
                this.mainscreen.activewin = this.winid;
                this.setNormal();
            }, this);

            this.window.addListener("close", this.handleClose, this);

            var closeok = 0;

            this.window.addListener("focus", function(e) {
                this.activatewin();
            }, this);

            this.window.addListener("beforeClose", function(e) {
                var mywindow = this.window;

                if (this.__viewmode == 1) {
                    e.preventDefault();
                    this.prefButton.setValue(false);
                } else if (this.__viewmode == 2) {
                    e.preventDefault();
                    this.urlButton.setValue(false);
                }
                else if (closeok == 0 && (this.type != 0 ||
                                          this.nameslist.getLength() > 0)) {
                    if (this.mainscreen.settings.getShowCloseWarn() == 1) {
                        e.preventDefault();

                        this.infoDialog.showInfoWin(
                            "Confirm",
                            "Are you sure?<p>You need to close windows only when " +
                                "you<br>wish to permanently stop following the discussion", "Yes",
                            function() {
                                closeok = 1;
                                mywindow.close();
                            }, "NO", function () {}, true);
                    } else {
                        this.mainscreen.removeWindowButton(this.winid);
                    }
                } else {
                    //closing for real.
                    this.mainscreen.removeWindowButton(this.winid);
                }
            }, this);
        },

        moveTo : function(x,y)
        {
            this.window.moveTo(x, y);
        },

        show : function()
        {
            this.window.open();
            this.hidden = false;
            this.updateButton();
        },

        hide : function()
        {
            this.window.minimize();
            this.hidden = true;
            this.updateButton();
        },

        getName : function()
        {
            return this.__name;
        },

        expandMOTD : function()
        {
            this.__channelText = this.__channelText.replace(/(<span style\="display\:none">|<\/span>|Click here to see details and MOTD\.)/g, "");

            this.addline("");
        },

        addntf : function (noteid, text)
        {
            if (this.__notes > 10)
                return;

            var notification = new qx.ui.basic.Label(text);
            notification.set({rich: true, backgroundColor: "#D6B6D6",
                              allowGrowX:true, marginRight:2});
            notification.setToolTip(this.__ntftooltip);
            notification.noteid = noteid;
            this.__notes++;

            notification.addListener("dblclick", function(e) {
                this.__notes--;
                this.__textcomposite.remove(notification);
                this.rpc.call("DELNTF", this.winid + " " + notification.noteid);
            }, this);

            this.__textcomposite.addAt(notification, 0);

            if (this.scrollLock == false) {
                this.scrollToBottom();
            }
        },

        addline : function(line)
        {
            //show images
            //line = line.replace(/<A HREF=\"(\S*?\.(png|jpg|jpeg))\"(.*?)<\/A>/g,
                //              "<br><br><a href=\"$1\" target=\"_blank\">" +
                        //      "<img border=\"0\" height=\"200\" style=\"max-width:500px;" +
                        //      "height:200px;\"" +
                        //      "src=\"$1\"></a> &nbsp;&nbsp;&nbsp;$&" );

            this.__channelText = this.__channelText + line;
            this.__lines++;

            // limit lines
            if (this.__lines > 200) {
                var pos = this.__channelText.search(/<\!-- x -->/i)
                this.__channelText = this.__channelText.substr(pos + 11);
            }

            this.__atom.setValue(this.__channelText);

            if (this.scrollLock == false) {
                this.scrollToBottom();
            }
        },

        scrollToBottom : function ()
        {
            this.__scroll.scrollToY(100000);
        },

        changetopic : function(line)
        {
            var nw = "(" + this.__nw + " channel) ";
            var cname = this.__name;

            this.__topic = line;

            if(line == "") {
                line = "Topic not set.";
            }

            if (this.__nw_id == 0 && this.type == 0) {
                cname = cname.substr(1, 1).toUpperCase() + cname.substr(2);
                nw = "Group: ";
            } else if (this.__nw_id == 0 && this.type == 1) {
                nw = "";
            }

            if (this.type == 0) {
                this.window.setCaption(nw + cname + " : " + line);
            } else {
                this.window.setCaption(nw + "*** Private conversation with " + cname);
            }
        },

        addnames : function(namesarray)
        {
            if (this.type != 0) {
                return;
            }

            this.nameslist.removeAll();

            for (var i = 0; i < namesarray.length; i++) {
                this.nameslist.push(this.createParticipant(namesarray[i]));
            }
        },

        createParticipant : function(name)
        {
            var person = new client.Participant();

            if (name.charAt(0) == "@") {
                name = name.substr(1);
                person.setOp(true);
            } else if (name.charAt(0) == "+") {
                name = name.substr(1);
                person.setVoice(true);
            }

            person.setName(name);
            person.setOnline(0); // Unknown

            return person;
        },

        addname : function(nick)
        {
            this.nameslist.push(this.createParticipant(nick));
        },

        delname : function(nick)
        {
            nick = nick.toLowerCase();

            this.nameslist.forEach(function(item) {
                if (item.getName().toLowerCase() == nick) {
                    this.nameslist.remove(item);
                }
            }, this);
        },

        setUserStatus : function (nick, online)
        {
            nick = nick.toLowerCase();

            //online: 0 = unknown, 1 = online, 2 = offline

            if (this.type == 0) {
                this.nameslist.forEach(function(item) {
                    if (item.getName().toLowerCase() == nick &&
                        item.getOnline() != online) {
                        item.setOnline(online);
                    }
                }, this);
            } else if (this.__nw_id == 0 && nick == this.__name.toLowerCase()) {
                var privstatus = "";

                if (online == 1) {
                    privstatus = "(online)";
                } else if (online == 2) {
                    privstatus = "(offline)";
                }

                this.window.setCaption("*** Private conversation with " +
                                       this.__name + " " + privstatus);
            }
        },

        getBackFromSettingsMode : function()
        {
            this.prefButton.setLabel("Settings");
            this.__box.remove(this.__settings);
            this.__box.add(this.__textcomposite, { row:0, column :0 });

            if (this.type == 0) {
                this.__box.add(this.__list, { row:0, column :1 });
            }

            this.__viewmode = 0;
            this.urlButton.setEnabled(true);
        },

        getBackFromUrlMode : function()
        {
            this.__box.remove(this.__urls);

            this.__box.add(this.__textcomposite, { row:0, column :0 });
            if (this.type == 0) {
                this.__box.add(this.__list, { row:0, column :1 });
            }

            this.__viewmode = 0;
            this.prefButton.setEnabled(true);
        },

        getList : function()
        {
            var list = new qx.ui.list.List(this.nameslist);
            list.setFocusable(false);
            list.setContextMenu(this.getContextMenu());

            list.setAllowGrowY(true);

            var delegate = {
                //Less than 0: Sort "x" to be a lower index than "y"
                sorter : function(x, y) {
                    if (x.getOp() && !y.getOp())
                        return -1;
                    else if (!x.getOp() && y.getOp())
                        return 1;

                    if (x.getVoice() && !y.getVoice())
                        return -1;
                    else if (!x.getVoice() && y.getVoice())
                        return 1;

                    var a = String(x.getName()).toUpperCase().replace(/[^A-Za-z]/g, "");
                    var b = String(y.getName()).toUpperCase().replace(/[^A-Za-z]/g, "");

                    if (a > b)
                        return 1;
                    else if (a < b)
                        return -1;
                    else
                        return 0;
                },

                configureItem : function(item) {
                    item.setPadding(3);
                },
                createItem : function() {
                    return new client.ListItem();
                },
                bindItem : function(controller, item, id) {
                    controller.bindProperty("name", "nick", null, item, id);
                    controller.bindProperty("op", "op", null, item, id);
                    controller.bindProperty("voice", "voice", null, item, id);
                    controller.bindProperty("online", "online", null, item, id);
                }
            };

            list.setDelegate(delegate);
            this.__list = list;

            return list;
        },

        getContextMenu : function()
        {
            var menu = new qx.ui.menu.Menu;

            var chatButton = new qx.ui.menu.Button("Start private chat with");

            chatButton.addListener("execute", function(e) {
                var name = this.__list.getSelection().getItem(0).getName();

                this.rpc.call("STARTCHAT", this.__nw + " " + name);
            }, this);

            menu.add(chatButton);

            if (this.__nw_id != 0) {

                var whoisButton = new qx.ui.menu.Button("Whois");

                whoisButton.addListener("execute", function(e) {
                    var name = this.__list.getSelection().getItem(0).getName();

                    this.rpc.call("WHOIS", this.winid + " " + name);
                }, this);

                menu.add(whoisButton);
            } else {
                var friendButton = new qx.ui.menu.Button("Add to contact list");

                friendButton.addListener("execute", function(e) {
                    var name = this.__list.getSelection().getItem(0).getName();

                    this.rpc.call("ADDF", name);
                }, this);

                if (this.mainscreen.anon_user == false) {
                    menu.add(friendButton);
                }
            }

            if (this.__usermode != 0 || this.__nw_id != 0) {

                var kickButton = new qx.ui.menu.Button("Kick");

                kickButton.addListener("execute", function(e) {
                    var name = this.__list.getSelection().getItem(0).getName();

                    this.rpc.call("KICK", this.winid + " " + name);
                }, this);

                menu.add(kickButton);

                var banButton = new qx.ui.menu.Button("Kick and ban");

                banButton.addListener("execute", function(e) {
                    var name = this.__list.getSelection().getItem(0).getName();

                    this.rpc.call("BAN", this.winid + " " + name);
                }, this);

                menu.add(banButton);
            }

            if (this.__nw_id != 0 || this.__usermode == 2) {
                var opButton = new qx.ui.menu.Button("Give operator rights");

                opButton.addListener("execute", function(e) {
                    var name = this.__list.getSelection().getItem(0).getName();

                    this.rpc.call("OP", this.winid + " " + name);
                }, this);

                menu.add(opButton);
            }

            return menu;
        },

        getUrlsView : function()
        {
            var scroll = new qx.ui.container.Scroll();

            scroll.set({
                scrollbarY : "auto"
            });

            this.__urllabel = new qx.ui.basic.Label("");
            this.__urllabel.setRich(true);
            this.__urllabel.setAllowGrowX(true);
            this.__urllabel.setAllowGrowY(true);
            this.__urllabel.setAlignY("top");

            scroll.add(this.__urllabel);

            return scroll;
        },

        updateUrls : function()
        {
            var text = "<b>Link Catcher</b><p>";

            if (this.mainscreen.anon_user == true) {
                text = text +
                    "(If you register, links are not lost when you log out.)<p>";
            }

            if (this.__urllist.length == 0) {
                text = text +
                  "<br><br><br><center>No links detected yet in conversation.<br><br>" +
                    "Press the L-button again to return normal view.</center>";
            } else {
                text = text + "<ul>";

                for (var i=0; i < this.__urllist.length; i++) {
                    text = text + "<li><a target=\"_blank\" href=\"" +
                        this.__urllist[i] + "\">" +
                        this.__urllist[i] + "</a><br></li>";
                }

                text = text + "</ul>";
            }
            this.__urllabel.setValue(text);
        },

        addUrl : function(url)
        {
            this.__urllist.push(url);
        },

        getSettingsView : function()
        {
            var composite = new qx.ui.container.Composite(
                new qx.ui.layout.Grid(12,12));

            //TOPIC

            var ltitle = new qx.ui.basic.Label("Topic:");

            this.topicInput = new qx.ui.form.TextField();
            this.topicInput.set({ maxLength: 200 });

            var button1 = new qx.ui.form.Button("Change");

            if (this.__nw_id != 0 || this.__usermode == 0) {
                button1.setEnabled(false);
            }

            button1.addListener("execute", function (e) {
                this.rpc.call("TOPIC", this.winid + " " + this.topicInput.getValue());
            }, this);

            if (this.type == 0) {
                composite.add(ltitle, {row:0, column: 0})
                composite.add(this.topicInput, {row: 0, column: 1});
                composite.add(button1, {row: 0, column: 2});
            }

            //SOUNDS

            var lsounds = new qx.ui.basic.Label("Audible alert:");
            composite.add(lsounds, {row:1, column: 0})

            var scomposite2 = new qx.ui.container.Composite(
                new qx.ui.layout.HBox(10));

            var syes = new qx.ui.form.RadioButton("On (play sound when new msg arrives)");
            var sno = new qx.ui.form.RadioButton("Off");
            var smanager = new qx.ui.form.RadioGroup(syes, sno);

            if (this.sound == 0) {
                sno.setValue(true);
            } else {
                syes.setValue(true);
            }

            syes.addListener("click", function(e) {
                this.sound = 1;

                this.rpc.call("SOUND", this.winid + " " + 1);
            }, this);

            sno.addListener("click", function(e) {
                this.sound = 0;

                this.rpc.call("SOUND", this.winid + " " + 0);
            }, this);

            scomposite2.add(syes);
            scomposite2.add(sno);

            composite.add(scomposite2, {row:1, column: 1});

            //TITLE ALERT

            var ltitles = new qx.ui.basic.Label("Visual alert:");
            composite.add(ltitles, {row:2, column: 0});

            var scomposite4 = new qx.ui.container.Composite(
                new qx.ui.layout.HBox(10));

            var tyes = new qx.ui.form.RadioButton(
                "On (make browser title bar blink when new msg arrives)");
            var tno = new qx.ui.form.RadioButton("Off");
            var tmanager = new qx.ui.form.RadioGroup(tyes, tno);

            if (this.titlealert == 0) {
                tno.setValue(true);
            } else {
                tyes.setValue(true);
            }

            tyes.addListener("click", function(e) {
                this.titlealert = 1;

                this.rpc.call("TITLEALERT", this.winid + " " + 1);
            }, this);

            tno.addListener("click", function(e) {
                this.titlealert = 0;

                this.rpc.call("TITLEALERT", this.winid + " " + 0);
            }, this);

            scomposite4.add(tyes);
            scomposite4.add(tno);

            composite.add(scomposite4, {row:2, column: 1});

            //PASSWORD
            this.pwInput = new qx.ui.form.TextField();
            this.pwInput.set({ maxLength: 20 });
            this.pwInput.setWidth(250);
            this.pwInput.setPlaceholder("<not set>");

            var button2 = new qx.ui.form.Button("Change");

            if (this.__nw_id != 0 || this.__usermode != 2) {
                button2.setEnabled(false);
            }

            button2.addListener("execute", function (e) {
                this.rpc.call("PW", this.winid + " " + this.pwInput.getValue());
            }, this);

            if (this.type == 0) {
                composite.add(new qx.ui.basic.Label("Password:"), {row:3, column: 0});
                composite.add(this.pwInput, {row: 3, column: 1});
                composite.add(button2, {row: 3, column: 2});
            }

            //Group URL:

            if (this.type == 0 && this.__nw_id == 0) {
                composite.add(new qx.ui.basic.Label("Participation link:"),
                              { row:4, column: 0 });
                var urltext = new qx.ui.basic.Label(
                    "http://meetandspeak.com/join/" + this.__name.substr(1));
                composite.add(urltext, {row:4, column: 1});
                urltext.set({ selectable: true, nativeContextMenu : true });
            }

            //OPER LIST

            if (this.__usermode == 2) {
                composite.add(new qx.ui.basic.Label("Operators:"),
                              { row:5, column: 0 });
            }

            var scroll1 = new qx.ui.container.Scroll();
            this.configListOper = new qx.ui.form.List;
            this.configListOper.set({ maxHeight: 90, selectionMode : "single" });
            scroll1.add(this.configListOper);
            scroll1.set({
                scrollbarX : "auto",
                scrollbarY : "auto", maxHeight: 90
            });

            if (this.__usermode == 2) {
                composite.add(scroll1, { row: 5, column: 1 });
                var buttonOper = new qx.ui.form.Button("Remove rights");
                buttonOper.setAllowStretchY(false);
                composite.add(buttonOper, { row: 5, column: 2 });

                buttonOper.addListener("execute", function(e) {
                    var userid = this.configListOper.getSelection()[0].userid;

                    this.rpc.call("DEOP", this.winid + " " + userid);
                }, this);
            }

            //BAN LIST

            if (this.__usermode != 0) {
                composite.add(new qx.ui.basic.Label("Ban list:"),
                              { row:6, column: 0 });
            }

            var scroll2 = new qx.ui.container.Scroll();
            this.configListBan = new qx.ui.form.List;
            this.configListBan.setAllowGrowX(true);
            this.configListBan.set({
                maxHeight: 90,
                minWidth: 900,
                width: 1000,
                selectionMode : "single" });

            scroll2.add(this.configListBan);
            scroll2.set({
                scrollbarX : "auto",
                scrollbarY : "auto",
                marginBottom : 15,
                maxHeight: 90
            });

            if (this.__usermode != 0) {
                composite.add(scroll2, {row: 6, column: 1});
                var buttonBan = new qx.ui.form.Button("Unban");
                buttonBan.setAllowStretchY(false);
                composite.add(buttonBan, {row: 6, column: 2});

                buttonBan.addListener("execute", function(e) {
                    var banid = this.configListBan.getSelection()[0].banid;

                    this.rpc.call("UNBAN", this.winid + " " + banid);
                }, this);
            }

            //Group API key

            if (this.type == 0 && this.__nw_id == 0 && this.__usermode == 2) {
                composite.add(new qx.ui.basic.Label("Group API key:"),
                              { row:7, column: 0 });
                this.apikey = new qx.ui.basic.Label("Refreshing...");
                this.apikey.set({ selectable: true, nativeContextMenu : true });

                this.rpc.call("GETKEY", this.winid);
                composite.add(this.apikey, { row: 7, column: 1 });

                var buttonKey = new qx.ui.form.Button("Generate new key");
                buttonKey.setAllowStretchY(false);
                composite.add(buttonKey, { row: 7, column: 2 });

                buttonKey.addListener("execute", function(e) {
                    this.rpc.call("SETKEY", this.winid);
                }, this);

            }

            return composite;
        },

        linkify : function (inputText)
        {
            //URLs starting with http://, https://, or ftp://
            var replacePattern1 =
                    /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
            var replacedText = inputText.replace(
                replacePattern1, '<A HREF="$1" target="_blank">$1</A>');

            //Change email addresses to mailto:: links
            var replacePattern3 = /(\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6})/gim;
            replacedText = replacedText.replace(replacePattern3,
                                                '<A HREF="mailto:$1">$1</A>');

            return replacedText;
        }
    }
});
