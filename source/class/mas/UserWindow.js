//
//   Copyright 2009-2013 Ilkka Oksanen <iao@iki.fi>
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing,
//   software distributed under the License is distributed on an "AS
//   IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
//   express or implied.  See the License for the specific language
//   governing permissions and limitations under the License.
//

qx.Class.define('mas.UserWindow',
{
    extend : qx.core.Object,

    construct : function(srpc, desktop, topic, nw, name, type, sound,
                         titlealert, nwId, usermode, password, newMsgs,
                         infoDialog, id, controller)
    {
        this.base(arguments);

        this.__urllist = [];
        this.nameslist = new qx.data.Array();
        this.rpc = srpc;
        this.infoDialog = infoDialog;
        this.winid = id;
        this.__nw = nw;
        this.__nwId = nwId;
        this._controller = controller;
        this.sound = sound;
        this.titlealert = titlealert;
        this.__usermode = usermode;
        this.__password = password;
        this.__newmsgsatstart = newMsgs;

        var layout = new qx.ui.layout.Grid();
        layout.setRowFlex(0, 1); // make row 0 flexible
        layout.setColumnFlex(0, 1); // make column 0 flexible
        layout.setColumnWidth(1, 105); // set with of column 1 to 200 pixel
        layout.setColumnAlign(1, 'center', 'middle');

        var wm1 = new qx.ui.window.Window().set({
            modal: false,
            allowMaximize: true,
            allowMinimize: false,
            resizeSensitivity: 10,
            contentPadding: [0,0,0,0]
        });

        wm1.setLayout(new qx.ui.layout.VBox(0));
        wm1.userWindowRef = this;

        if (this._controller.anonUser === true) {
            wm1.setShowClose(false);
        }

        var color = (type === 0) ? '#F2F3FC' : '#F7FAC9';

        this.__box = new qx.ui.container.Composite(layout).set({
            padding:10,
            margin: 0,
            backgroundColor: color
        });

        wm1.add(this.__box, { flex: 1 });

        // create scroll container
        this.__scroll = new mas.Scroll().set({
            minWidth: 100,
            minHeight: 50,
            scrollbarY : 'on'
        });

        this.__scroll.addListener('scrollLock', function(e) {
            var caption = this.window.getCaption();

            if (e.getData() === true) {
                this.window.setCaption('[SCROLL LOCK] ' + caption);
                this.scrollLock = true;
            } else {
                this.window.setCaption(caption.replace(
                        /^\[SCROLL LOCK\] /, ''));
                this.scrollLock = false;
            }
        }, this);

        this.__textcomposite = new qx.ui.container.Composite(
            new qx.ui.layout.VBox(2));
        this.__ntftooltip = new qx.ui.tooltip.ToolTip(
            'Double-click to close this notification.');

        color = (type === 0) ? '#F2F5FE' : '#F7FAC9';

        this.__atom = new qx.ui.basic.Label('Please wait...<br>').set({
            rich: true,
            selectable: true,
            nativeContextMenu : true,
            backgroundColor: color
        });

        this.__scroll.add(this.__atom);
        this.__textcomposite.add(this.__scroll, { flex: 1 });
        this.__box.add(this.__textcomposite, { row: 0, column: 0 });

        this.__inputline = new qx.ui.form.TextField().set({
            maxLength: 400,
            marginTop: 2
        });

        this.__inputline.focus();
        this.__inputline.addListener('keydown', this.handleKeyPress, this);

        var icomposite = new qx.ui.container.Composite(
            new qx.ui.layout.HBox(5));

        icomposite.add(this.__inputline, { flex : 1 });

        this.__box.add(icomposite, {row: 1, column: 0});

        this.prefButton = new qx.ui.form.ToggleButton('Settings');
        this.urlButton = new qx.ui.form.ToggleButton('L');

        this.prefButton.setFocusable(false);
        this.urlButton.setFocusable(false);

        this.prefButton.setMargin(2,5,2,5);
        this.urlButton.setMargin(2,5,2,5);

        var buttons = new qx.ui.container.Composite(
            new qx.ui.layout.HBox(0));

        buttons.add(this.prefButton);
        buttons.add(this.urlButton);

        if (type === 0) {
            this.__box.add(this.getList(), {row: 0, column: 1});
            this.__box.add(buttons, {row: 1, column: 1});
        } else {
            icomposite.add(buttons);
        }

        this.window = wm1;
        this.type = type;
        this.__name = name;
        this.__settings = this.getSettingsView();
        this.__urls = this.getUrlsView();

        this.prefButton.addListener('changeValue', function(e) {
            if (e.getData() === true) {
                this.urlButton.setEnabled(false);

                this.topicInput.setValue(this.__topic);
                this.pwInput.setValue(this.__password);

                if (this.__usermode === 2) {
                    this.configListOper.removeAll();
                    this.configListOper.add(new qx.ui.form.ListItem(
                        'Refreshing...'));

                    this.rpc.call('GETOPERS', this.winid);
                }

                if (this.__usermode !== 0) {
                    this.configListBan.removeAll();
                    this.configListBan.add(new qx.ui.form.ListItem(
                        'Refreshing...'));

                    this.rpc.call('GETBANS', this.winid);
                }

                this.__box.remove(this.__textcomposite);
                if (this.type === 0) {
                    this.__box.remove(this.__list);
                    this.__box.add(this.__settings,
                                   { row : 0, column : 0, colSpan : 2 });
                } else {
                    this.__box.add(this.__settings, { row : 0, column : 0 });
                }

                this.__viewmode = 1;
            } else {
                this.getBackFromSettingsMode();
            }
        }, this);

        this.urlButton.addListener('changeValue', function(e) {
            if (e.getData() === true) {
                this.prefButton.setEnabled(false);
                this.updateUrls();

                this.__box.remove(this.__textcomposite);
                if (this.type === 0) {
                    this.__box.remove(this.__list);
                    this.__box.add(this.__urls,
                                   { row : 0, column : 0, colSpan : 2 });
                } else {
                    this.__box.add(this.__urls, {row : 0, column : 0 });
                }

                this.__viewmode = 2;
            } else {
                this.getBackFromUrlMode();
            }
        }, this);

        this.changetopic(topic);
    },

    //TODO: write proper destructor
    members :
    {
        window : 0,
        winid : 0,
        rpc : 0,
        titlealert : 0,
        sound : 0,
        configListBan : 0,
        configListOper : 0,
        nameslist : null,
        closeok : 0,
        scrollLock : false,
        infoDialog : 0,
        type : 0,
        apikey : 0,

        _searchstart: 0,
        _searchstring: '',
        _extendedsearch: false,

        _controller : null,
        __notes : 0,
        __inputline : 0,
        __urllabel : 0,
        __list : 0,
        __atom : 0,
        __channelText : '',
        __scroll : 0,
        __lines : 0,
        __settings : 0,
        __urls : 0,
        __viewmode : 0,
        __box : 0,
        __nw : 0,
        __nwId : 0,
        __topic : 0,
        __name : 0,
        __password : 0,
        __usermode : 0,
        __newmsgsatstart : 0,
        __urllist : null,
        __ntftooltip : 0,
        __textcomposite : 0,

        updateValues : function(topic, nw, name, type, sound, titlealert,
                                nwId, usermode, password)
        {
            this.__password = password;
            this.__usermode = usermode;
            this.__topic = topic;
            this.__name = name;

            //show potential name or topic change
            this.changetopic(topic);

            if (this.__viewmode === 1) {
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

            if (this._controller.initdone === 1) {
                this.rpc.call('RESIZE', this.winid + ' ' + width + ' ' +
                              height);
            }
        },

        handleClose : function()
        {
            this.rpc.call('CLOSE', this.winid);

            qx.event.Timer.once(function() {
                this._controller.tileWindows();
            }, this, 1000);
            debug.print('works2');
        },

        //TODO: handle beforeclose -> remove from mainscreen array

        handleKeyPress : function(e) {
            var key = e.getKeyIdentifier();

            if (key === 'Enter') {
                debug.print('enter pressed');

                var input = this.__inputline.getValue();
                if (input !== '' && input !== null) {
                    this.rpc.call('SEND', this.winid + ' ' + input);
                    this.__inputline.setValue('');

                    input = input.replace(/</g, '&lt;');
                    input = input.replace(/>/g, '&gt;');

                    if (!(input.substr(0,1) === '/' &&
                        input.substr(0,4) !== '/me ')) {
                        var currentTime = new Date();
                        var hour = currentTime.getHours();
                        var min = currentTime.getMinutes();

                        if (min < 10) {
                            min = '0' + min;
                        }

                        if (hour < 10) {
                            hour = '0' + hour;
                        }

                        var fakeMsg = {
                            type: 0,
                            cat: input.substr(0,4) === '/me ' ?
                                'mymsg' : 'action',
                            nick: this._controller.nicks[this.__nwId],
                            body: this.linkify(input),
                            ts: hour * 60 + min
                        };

                        this.addline(fakeMsg, false);
                    }
                }
                this.setNormal();
            } else if (key === 'PageUp') {
                this.__scroll.scrollByY((this.__scroll.getHeight() - 30) * - 1);
            }
            else if (key === 'PageDown') {
                this.__scroll.scrollByY(this.__scroll.getHeight() - 30);
            } else if (key === 'Tab' && this.type === 0) {
                var input2 = this.__inputline.getValue();

                if (input2 === null) {
                    input2 = '';
                }

                if (input2.length === 0 || input2.search(/^\S+\s*$/) !== -1) {
                    if (this._extendedsearch === false) {
                        this._extendedsearch = true;
                        this._searchstring = input2;
                    }

                    var found = false;

                    for (var i = this._searchstart; i <
                                 this.nameslist.getLength(); i++) {
                        var name = this.nameslist.getItem(i).getName();

                        if (name.substr(
                            0, this._searchstring.length).toLowerCase() ===
                            this._searchstring.toLowerCase()) {
                            this.__inputline.setValue(name + ': ');
                            this.__inputline.setTextSelection(100,100);
                            this._searchstart = i + 1;
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        this._searchstart = 0;
                    }
                }

                e.stopPropagation();
                e.preventDefault();
            }

            if (key !== 'Tab') {
                this._searchstart = 0;
                this._searchstring = '';
                this._extendedsearch = false;
            }
        },

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

        setNormal : function()
        {
            this.__taskbarButtonColor = '000000';

            if (this.__newmsgsatstart !== 0) {
                this.__newmsgsatstart = 0;
                this.rpc.call('SEEN', this.winid);
            }
        },

        handleMove : function(e)
        {
            var data = e.getData();
            var x = data.left;
            var y = data.top;

            if (this._controller.initdone === 1) {
                this.rpc.call('MOVE', this.winid + ' ' + x + ' ' + y);
            }
        },

        setFonts : function(large)
        {

            if (large === '1') {
                this.__atom.setFont('defaultlarge');
                this.__inputline.setFont('defaultlarge');
            } else {
                this.__atom.setFont('default');
                this.__inputline.setFont('default');
            }

            this.__scroll.scrollToY(200000);
        },

        updateOperList : function(message) {
            this.configListOper.removeAll();

            for (var i=0; i < message.list.length; i++) {
                var operList = new qx.ui.form.ListItem(
                    message.list[i].nick);
                operList.userid = message.list[i].userId;
                this.configListOper.add(operList);
            }
        },

        updateBanList : function(message) {
            this.configListBan.removeAll();

            for (var i = 0; i < message.list.length; i++) {
                var banList = new qx.ui.form.ListItem(message.list[i].info);
                banList.banid = message.list[i].banId;
                this.configListBan.add(banList);
            }
        },

        activatewin : function()
        {
            this.window.activate();
        },

        addHandlers : function()
        {
            this.window.addListener('resize', this.handleResize, this);
            this.window.addListener('move', this.handleMove, this);

            this.window.addListener('click', function() {
                this.setNormal();
            }, this);

            this.window.addListener('close', this.handleClose, this);

            var closeok = 0;

            this.window.addListener('focus', function() {
                this.activatewin();
            }, this);

            this.window.addListener('beforeClose', function(e) {
                var mywindow = this.window;

                if (this.__viewmode === 1) {
                    e.preventDefault();
                    this.prefButton.setValue(false);
                } else if (this.__viewmode === 2) {
                    e.preventDefault();
                    this.urlButton.setValue(false);
                }
                else if (closeok === 0 && (this.type !== 0 ||
                                          this.nameslist.getLength() > 0)) {
                    //FIX ME
                    //if (this.mainscreen.settings.getShowCloseWarn() === 1) {
                        e.preventDefault();

                        this.infoDialog.showInfoWin(
                            'Confirm',
                            'Are you sure?<p>You need to close windows only ' +
                                'when you<br>wish to permanently stop ' +
                                'following the discussion', 'Yes',
                            function() {
                                closeok = 1;
                                mywindow.close();
                            }, 'NO', function () {}, true);
                    //} else {
                    //    this.mainscreen.removeWindowButton(this.winid);
                    //}
                //} else {
                //    closing for real.
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
        },

        getName : function()
        {
            return this.__name;
        },

        addntf : function (noteid, text)
        {
            if (this.__notes > 10) {
                return;
            }

            var notification = new qx.ui.basic.Label(text).set({
                rich: true,
                backgroundColor: '#D6B6D6',
                allowGrowX: true,
                marginRight: 2,
                toolTip: this.__ntftooltip
            });

            notification.noteid = noteid;
            this.__notes++;

            notification.addListener('dblclick', function() {
                this.__notes--;
                this.__textcomposite.remove(notification);
                this.rpc.call('DELNTF', this.winid + ' ' + notification.noteid);
            }, this);

            this.__textcomposite.addAt(notification, 0);

            if (this.scrollLock === false) {
                this.scrollToBottom();
            }
        },

        addline : function(message, tsConversion)
        {
            var nickText = '';
            var ts = this._adjustTime(message.ts, tsConversion);

            if (message.nick) {
                nickText = '<b>&lt;' + message.nick + '&gt;</b> ';
            }

            var color;
            var prefix = '';

            switch (message.cat) {
            case 'msg':
                color = 'black';
                break;
            case 'info':
                color = 'green';
                prefix = '*** ';
                break;
            case 'notice':
                color = 'grey';
                prefix = '';
                break;
            case 'error':
                color = 'red';
                prefix = '*** ';
                break;
            case 'mymsg':
                color = 'blue';
                break;
            case 'mention':
                color = 'cyan';
                break;
            case 'action':
                color = 'black';
                prefix = ' * ';
                break;
            case 'robot':
                color = 'brown';
            }

            this.__channelText = this.__channelText + '<span style="color:' +
                color + '">' + ts + ' ' + prefix + nickText + message.body +
                '<span><br>';
            this.__lines++;

            // limit lines
            if (this.__lines > 200) {
                var pos = this.__channelText.search(/<br>/i);
                this.__channelText = this.__channelText.substr(pos + 3);
            }

            if (this._controller.initdone === 1) {
                this.displayWindowContent();
            }
        },

        displayWindowContent : function() {
            this.__atom.setValue(this.__channelText);

            if (this.scrollLock === false) {
                this.scrollToBottom();
            }
        },

        scrollToBottom : function ()
        {
            this.__scroll.scrollToY(100000);
        },

        changetopic : function(line)
        {
            var nw = '(' + this.__nw + ' channel) ';
            var cname = this.__name;

            this.__topic = line;

            if(line === '') {
                line = 'Topic not set.';
            }

            if (this.__nwId === 0 && this.type === 0) {
                cname = cname.substr(1, 1).toUpperCase() + cname.substr(2);
                nw = 'Group: ';
            } else if (this.__nwId === 0 && this.type === 1) {
                nw = '';
            }

            if (this.type === 0) {
                this.window.setCaption(nw + cname + ' : ' + line);
            } else {
                this.window.setCaption(nw + '*** Private conversation with ' +
                                       cname);
            }
        },

        addnames : function(namesarray)
        {
            if (this.type !== 0) {
                return;
            }

            this.nameslist.removeAll();

            for (var i = 0; i < namesarray.length; i++) {
                this.nameslist.push(this.createParticipant(namesarray[i]));
            }
        },

        createParticipant : function(name)
        {
            var person = new mas.Participant();

            if (name.charAt(0) === '@') {
                name = name.substr(1);
                person.setOp(true);
            } else if (name.charAt(0) === '+') {
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
                if (item.getName().toLowerCase() === nick) {
                    this.nameslist.remove(item);
                }
            }, this);
        },

        setUserStatus : function (nick, online)
        {
            nick = nick.toLowerCase();

            //online: 0 = unknown, 1 = online, 2 = offline

            if (this.type === 0) {
                this.nameslist.forEach(function(item) {
                    if (item.getName().toLowerCase() === nick &&
                        item.getOnline() !== online) {
                        item.setOnline(online);
                    }
                }, this);
            } else if (this.__nwId === 0 &&
                       nick === this.__name.toLowerCase()) {
                var privstatus = '';

                if (online === 1) {
                    privstatus = '(online)';
                } else if (online === 2) {
                    privstatus = '(offline)';
                }

                this.window.setCaption('*** Private conversation with ' +
                                       this.__name + ' ' + privstatus);
            }
        },

        _adjustTime : function(time, tsConversion)
        {
            var date = new Date();

            if (tsConversion) {
                time = time - date.getTimezoneOffset();
            }

            if (time < 0) {
                time = 1440 + time;
            }

            if (time > 1440) {
                time = time - 1440;
            }

            var hour = Math.floor(time / 60);
            var min = time % 60;

            if (min < 10) {
                min = '0' + min;
            }

            if (hour < 10) {
                hour = '0' + hour;
            }

            return hour + ':' + min;
        },

        getBackFromSettingsMode : function()
        {
            this.prefButton.setLabel('Settings');
            this.__box.remove(this.__settings);
            this.__box.add(this.__textcomposite, { row:0, column :0 });

            if (this.type === 0) {
                this.__box.add(this.__list, { row:0, column :1 });
            }

            this.__viewmode = 0;
            this.urlButton.setEnabled(true);
        },

        getBackFromUrlMode : function()
        {
            this.__box.remove(this.__urls);

            this.__box.add(this.__textcomposite, { row:0, column :0 });
            if (this.type === 0) {
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
                //Less than 0: Sort 'x' to be a lower index than 'y'
                sorter : function(x, y) {
                    if (x.getOp() && !y.getOp()) {
                        return -1;
                    } else if (!x.getOp() && y.getOp()) {
                        return 1;
                    }

                    if (x.getVoice() && !y.getVoice()) {
                        return -1;
                    } else if (!x.getVoice() && y.getVoice()) {
                        return 1;
                    }

                    var a = String(
                        x.getName()).toUpperCase().replace(/[^A-Za-z]/g, '');
                    var b = String(
                        y.getName()).toUpperCase().replace(/[^A-Za-z]/g, '');

                    if (a > b) {
                        return 1;
                    } else if (a < b) {
                        return -1;
                    } else {
                        return 0;
                    }
                },

                configureItem : function(item) {
                    item.setPadding(3);
                },
                createItem : function() {
                    return new mas.ListItem();
                },
                bindItem : function(controller, item, id) {
                    controller.bindProperty('name', 'nick', null, item, id);
                    controller.bindProperty('op', 'op', null, item, id);
                    controller.bindProperty('voice', 'voice', null, item, id);
                    controller.bindProperty('online', 'online', null, item, id);
                }
            };

            list.setDelegate(delegate);
            this.__list = list;

            return list;
        },

        getContextMenu : function()
        {
            var menu = new qx.ui.menu.Menu();

            var chatButton = new qx.ui.menu.Button('Start private chat with');

            chatButton.addListener('execute', function() {
                var name = this.__list.getSelection().getItem(0).getName();

                this.rpc.call('STARTCHAT', this.__nw + ' ' + name);
            }, this);

            menu.add(chatButton);

            if (this.__nwId !== 0) {

                var whoisButton = new qx.ui.menu.Button('Whois');

                whoisButton.addListener('execute', function() {
                    var name = this.__list.getSelection().getItem(0).getName();

                    this.rpc.call('WHOIS', this.winid + ' ' + name);
                }, this);

                menu.add(whoisButton);
            } else {
                var friendButton = new qx.ui.menu.Button('Add to contact list');

                friendButton.addListener('execute', function() {
                    var name = this.__list.getSelection().getItem(0).getName();

                    this.rpc.call('ADDF', name);
                }, this);

                //Fix me
                //if (this._controller.anonUser === false) {
                    menu.add(friendButton);
                //}
            }

            if (this.__usermode !== 0 || this.__nwId !== 0) {

                var kickButton = new qx.ui.menu.Button('Kick');

                kickButton.addListener('execute', function() {
                    var name = this.__list.getSelection().getItem(0).getName();

                    this.rpc.call('KICK', this.winid + ' ' + name);
                }, this);

                menu.add(kickButton);

                var banButton = new qx.ui.menu.Button('Kick and ban');

                banButton.addListener('execute', function() {
                    var name = this.__list.getSelection().getItem(0).getName();

                    this.rpc.call('BAN', this.winid + ' ' + name);
                }, this);

                menu.add(banButton);
            }

            if (this.__nwId !== 0 || this.__usermode === 2) {
                var opButton = new qx.ui.menu.Button('Give operator rights');

                opButton.addListener('execute', function() {
                    var name = this.__list.getSelection().getItem(0).getName();

                    this.rpc.call('OP', this.winid + ' ' + name);
                }, this);

                menu.add(opButton);
            }

            return menu;
        },

        getUrlsView : function()
        {
            var scroll = new qx.ui.container.Scroll().set({
                scrollbarY : 'auto'
            });

            this.__urllabel = new qx.ui.basic.Label('').set({
                rich: true,
                allowGrowX: true,
                allowGrowY: true,
                alignY: 'top'
            });

            scroll.add(this.__urllabel);

            return scroll;
        },

        updateUrls : function()
        {
            var text = '<b>Link Catcher</b><p>';

            //if (this.mainscreen.anonUser === true) {
            //    text = text +
            //     '(If you register, links are not lost when you log out.)' +
            //     '<p>';
            //}

            if (this.__urllist.length === 0) {
                text = text +
                  '<br><br><br><center>No links detected yet in conversation.' +
                    '<br><br>Press the L-button again to return normal view.' +
                    '</center>';
            } else {
                text = text + '<ul>';

                for (var i=0; i < this.__urllist.length; i++) {
                    text = text + '<li><a target="_blank" href="' +
                        this.__urllist[i] + '">' +
                        this.__urllist[i] + '</a><br></li>';
                }

                text = text + '</ul>';
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

            var ltitle = new qx.ui.basic.Label('Topic:');

            this.topicInput = new qx.ui.form.TextField().set({
                maxLength: 200
            });

            var button1 = new qx.ui.form.Button('Change');

            if (this.__nwId !== 0 || this.__usermode === 0) {
                button1.setEnabled(false);
            }

            button1.addListener('execute', function () {
                this.rpc.call('TOPIC', this.winid + ' ' +
                              this.topicInput.getValue());
            }, this);

            if (this.type === 0) {
                composite.add(ltitle, { row:0, column: 0 });
                composite.add(this.topicInput, { row: 0, column: 1 });
                composite.add(button1, { row: 0, column: 2 });
            }

            //SOUNDS

            var lsounds = new qx.ui.basic.Label('Audible alert:');
            composite.add(lsounds, { row:1, column: 0 });

            var scomposite2 = new qx.ui.container.Composite(
                new qx.ui.layout.HBox(10));

            var syes = new qx.ui.form.RadioButton(
                'On (play sound when new msg arrives)');
            var sno = new qx.ui.form.RadioButton('Off');
            new qx.ui.form.RadioGroup(syes, sno);

            if (this.sound === 0) {
                sno.setValue(true);
            } else {
                syes.setValue(true);
            }

            syes.addListener('click', function() {
                this.sound = 1;

                this.rpc.call('SOUND', this.winid + ' ' + 1);
            }, this);

            sno.addListener('click', function() {
                this.sound = 0;

                this.rpc.call('SOUND', this.winid + ' ' + 0);
            }, this);

            scomposite2.add(syes);
            scomposite2.add(sno);

            composite.add(scomposite2, {row:1, column: 1});

            //TITLE ALERT

            var ltitles = new qx.ui.basic.Label('Visual alert:');
            composite.add(ltitles, {row:2, column: 0});

            var scomposite4 = new qx.ui.container.Composite(
                new qx.ui.layout.HBox(10));

            var tyes = new qx.ui.form.RadioButton(
                'On (make browser title bar blink when new msg arrives)');
            var tno = new qx.ui.form.RadioButton('Off');
            new qx.ui.form.RadioGroup(tyes, tno);

            if (this.titlealert === 0) {
                tno.setValue(true);
            } else {
                tyes.setValue(true);
            }

            tyes.addListener('click', function() {
                this.titlealert = 1;

                this.rpc.call('TITLEALERT', this.winid + ' ' + 1);
            }, this);

            tno.addListener('click', function() {
                this.titlealert = 0;

                this.rpc.call('TITLEALERT', this.winid + ' ' + 0);
            }, this);

            scomposite4.add(tyes);
            scomposite4.add(tno);

            composite.add(scomposite4, {row:2, column: 1});

            //PASSWORD
            this.pwInput = new qx.ui.form.TextField().set({
                maxLength: 20
            });
            this.pwInput.setWidth(250);
            this.pwInput.setPlaceholder('<not set>');

            var button2 = new qx.ui.form.Button('Change');

            if (this.__nwId !== 0 || this.__usermode !== 2) {
                button2.setEnabled(false);
            }

            button2.addListener('execute', function () {
                this.rpc.call('PW', this.winid + ' ' + this.pwInput.getValue());
            }, this);

            if (this.type === 0) {
                composite.add(new qx.ui.basic.Label('Password:'),
                              {row: 3, column: 0});
                composite.add(this.pwInput, {row: 3, column: 1});
                composite.add(button2, { row: 3, column: 2 });
            }

            //Group URL:

            if (this.type === 0 && this.__nwId === 0) {
                composite.add(new qx.ui.basic.Label('Participation link:'),
                              { row: 4, column: 0 });

                var urltext = new qx.ui.basic.Label(
                    'http://meetandspeak.com/join/' +
                        this.__name.substr(1)).set({
                            selectable: true,
                            nativeContextMenu : true
                        });
                composite.add(urltext, { row: 4, column: 1 });

            }

            //OPER LIST

            if (this.__usermode === 2) {
                composite.add(new qx.ui.basic.Label('Operators:'),
                              { row:5, column: 0 });
            }

            this.configListOper = new qx.ui.form.List().set({
                maxHeight: 90,
                selectionMode: 'single'
            });

            var scroll1 = new qx.ui.container.Scroll().set({
                scrollbarX: 'auto',
                scrollbarY: 'auto',
                maxHeight: 90
            });

            scroll1.add(this.configListOper);

            if (this.__usermode === 2) {
                composite.add(scroll1, { row: 5, column: 1 });
                var buttonOper = new qx.ui.form.Button('Remove rights');
                buttonOper.setAllowStretchY(false);
                composite.add(buttonOper, { row: 5, column: 2 });

                buttonOper.addListener('execute', function() {
                    var userid = this.configListOper.getSelection()[0].userid;

                    this.rpc.call('DEOP', this.winid + ' ' + userid);
                }, this);
            }

            //BAN LIST

            if (this.__usermode !== 0) {
                composite.add(new qx.ui.basic.Label('Ban list:'),
                              { row:6, column: 0 });
            }

            var scroll2 = new qx.ui.container.Scroll().set({
                scrollbarX: 'auto',
                scrollbarY: 'auto',
                marginBottom: 15,
                maxHeight: 90
            });

            this.configListBan = new qx.ui.form.List().set({
                maxHeight: 90,
                minWidth: 900,
                width: 1000,
                selectionMode : 'single',
                allowGrowX: true
            });

            scroll2.add(this.configListBan);

            if (this.__usermode !== 0) {
                composite.add(scroll2, {row: 6, column: 1});
                var buttonBan = new qx.ui.form.Button('Unban');
                buttonBan.setAllowStretchY(false);
                composite.add(buttonBan, {row: 6, column: 2});

                buttonBan.addListener('execute', function() {
                    var banid = this.configListBan.getSelection()[0].banid;

                    this.rpc.call('UNBAN', this.winid + ' ' + banid);
                }, this);
            }

            //Group API key

            if (this.type === 0 && this.__nwId === 0 && this.__usermode === 2) {
                composite.add(new qx.ui.basic.Label('Group API key:'),
                              { row:7, column: 0 });
                this.apikey = new qx.ui.basic.Label('Refreshing...').set({
                    selectable: true,
                    nativeContextMenu: true
                });

                this.rpc.call('GETKEY', this.winid);
                composite.add(this.apikey, { row: 7, column: 1 });

                var buttonKey = new qx.ui.form.Button('Generate new key').set({
                    allowStretchY: false
                });
                composite.add(buttonKey, { row: 7, column: 2 });

                buttonKey.addListener('execute', function() {
                    this.rpc.call('SETKEY', this.winid);
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
