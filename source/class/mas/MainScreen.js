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

qx.Class.define('mas.MainScreen',
{
    extend : qx.core.Object,

    construct : function(
        srpc, rootItem, logDialog, settings, anonUser, controller)
    {
        this.base(arguments);

        this.rpc = srpc;
        this.logDialog = logDialog;
        this.settings = settings;
        this.anonUser = anonUser;
        this._controller = controller;

        this.__topictimer = new qx.event.Timer(1000);
        this.__topictimer.addListener(
            'interval', function() {
                //there seems to be bug in qooxdoo, one event can come after the
                //timer is stopped
                if (this.__topictimeractive === true) {
                    if (this.__topicstate === 0) {
                        document.title = '[NEW] MeetAndSpeak';
                        this.__topicstate = 1;
                    } else {
                        document.title = '[MSG] MeetAndSpeak';
                        this.__topicstate = 0;
                    }
                } else {
                    document.title = 'MeetAndSpeak';
                }
            }, this);

        this.__tt = new qx.ui.tooltip.ToolTip('Send Message');
        this.__myapp = rootItem;

        qx.bom.Element.addListener(window, 'focus', function() {
            qx.event.Timer.once(function(){
                document.title = 'MeetAndSpeak';
            }, this, 500);
            this.__blur = 0;

            if (this.__topictimeractive === true) {
                this.__topictimer.stop();
                this.__topictimeractive = false;
            }
        }, this);

        qx.bom.Element.addListener(window, 'blur', function() {
            this.__blur = 1;
        }, this);
    },

    members :
    {
        rootContainer : 0,
        desktop : 0,
        contactsButton : 0,
        rpc : 0,

        logDialog : 0,
        infoDialog : 0,
        settings : 0,
        anonUser : 0,
        blocker : 0,
        manager : 0,

        __statusBar : 0,
        __startLabel : 0,
        __part2 : 0,
        __part3 : 0,
        __windowGroup : 0,
        __myapp : 0,
        __topictimer : 0,
        __topicstate : 0,
        __tt : 0,
        __blur : 0,
        __input1 : 0,
        __topictimeractive : 0,
        __prevwin : -1,
        __msgvisible : 0,

        show : function()
        {
            // Root widget
            this.rootContainer = new qx.ui.container.Composite(
                new qx.ui.layout.VBox(0));
            this.rootContainer.set({ backgroundColor: '#717172',
                                     padding: 0 });

            // middle desktop
            this.manager = new qx.ui.window.Manager();
            var middleContainer = new qx.ui.window.Desktop(this.manager);

            middleContainer.addListener(
                'resize',
                this._controller.checkLimits,
                this);

            var middleSection = new qx.ui.container.Composite(
                new qx.ui.layout.HBox(0));

            this.desktop = middleContainer;
            this.blocker = new qx.ui.core.Blocker(middleContainer);
            this.blocker.setOpacity(0.5);
            this.blocker.setColor('black');

            middleContainer.set({ decorator: 'background2',
                                  backgroundColor: '#DFE5E5' });
            middleSection.add(middleContainer, { flex:1 });

            this.rootContainer.add(middleSection, { flex: 1 });

            // create the toolbar
            var toolbar = new qx.ui.toolbar.ToolBar();
            toolbar.set({ maxHeight : 40, spacing : 30 });

            // create and add Part 1 to the toolbar
            this.__part2 = new qx.ui.toolbar.Part();
            this.__part3 = new qx.ui.toolbar.Part();

            toolbar.add(this.__part2);
            toolbar.addSpacer();

            var menuButton = new qx.ui.toolbar.MenuButton('Menu', null,
                                                          this.getMainMenu());
            this.__part3.add(menuButton);

            if (this.anonUser === false) {
                var contactsButton = new qx.ui.toolbar.CheckBox(
                    '<span style="color:#000000">Contacts...</span>');
                contactsButton.setRich(true);
                this.contactsButton = contactsButton;
                this.__part3.add(contactsButton);

                contactsButton.setValue(false);

                contactsButton.addListener('changeValue', function (e) {
                    if (e.getData() === true &&
                        this.contactsButton.getValue() === true) {
                        this.contactsPopup.placeToWidget(contactsButton);
                        this.contactsPopup.show();
                    }
                }, this);

                toolbar.add(this.__part3);
            }

            this.rootContainer.add(toolbar);
            this.__myapp.add(this.rootContainer,
                             { width: '100%', height: '100%' });
                             //, {padding : 10});

            //Status bar
            this.__statusBar = new qx.ui.basic.Label('');
            this.__statusBar.set({ backgroundColor: '#ff0000',
                                   zIndex: 100,
                                   textColor: '#ffffff',
                                   font: new qx.bom.Font(23, ['Arial',
                                                               'sans-serif']),
                                   padding: 14});
            this.__statusBar.hide();
            this.__myapp.add(this.__statusBar, { left: 100, top: 0 });
        },

        getMainMenu : function()
        {
            var menu = new qx.ui.menu.Menu();

            var forumMenu = new qx.ui.menu.Button('Groups', null, null,
                                                     this.getForumMenu());
            var viewMenu = new qx.ui.menu.Button('View', null, null,
                                                    this.getViewMenu());
            var settingsMenu = new qx.ui.menu.Button('Settings', null, null,
                                                    this.getSettingsMenu());
            var advancedMenu = new qx.ui.menu.Button('Advanced', null, null,
                                                        this.getAdvancedMenu());
            var helpMenu = new qx.ui.menu.Button('Help', null, null,
                                                 this.getHelpMenu());
            var logoutMenu = new qx.ui.menu.Button('Log Out', null, null,
                                                      this.getLogoutMenu());

            if (this.anonUser === false) {
                menu.add(forumMenu);
            }

            menu.add(viewMenu);
            menu.add(settingsMenu);

            if (this.anonUser === false) {
                menu.add(advancedMenu);
            }

            menu.add(helpMenu);
            menu.add(logoutMenu);

            return menu;
        },

        setStatusText : function(text)
        {
            if (text === '') {
                this.__statusBar.hide();
            } else {
                this.__statusBar.setValue(text);
                this.__statusBar.show();
            }
        },

        showFriendRequest : function(message)
        {
            var friendId = message.friendId;
            var friendNick = message.friendNick;
            var friendName = message.friendName;

            if (this.__msgvisible === false) {
                this.msg = new qx.ui.container.Composite(
                    new qx.ui.layout.HBox(8));
                this.msg.setPadding(5, 15, 5, 15);
                this.msg.set({ backgroundColor: 'yellow'});

                this.msg.add(new qx.ui.basic.Label(
                    friendName + ' (' + friendNick +
                        ') wants to be your friend. Is this OK?'));

                var accept = new qx.ui.basic.Label(
                    '<font color="blue">ACCEPT</font>');
                var decline = new qx.ui.basic.Label(
                    '<font color="blue">DECLINE</font>');
                accept.setRich(true);
                decline.setRich(true);

                accept.addListener('click', function () {
                    this.rpc.call('OKF', friendId);
                    //TODO: this relies on proper carbage collection
                    this.rootContainer.remove(this.msg);
                    this.__msgvisible = false;
                }, this);

                decline.addListener('click', function () {
                    this.rpc.call('NOKF', friendId);
                    //TODO: this relies on proper carbage collection
                    this.rootContainer.remove(this.msg);
                    this.__msgvisible = false;
                }, this);

                this.msg.add(accept);
                this.msg.add(decline);
                this.__msgvisible = true;

                this.rootContainer.addAt(this.msg, 1, {flex:0});
            }
            // else ignore command
        },

        getLogoutMenu : function()
        {
            var menu = new qx.ui.menu.Menu();
            var logoutButton = new qx.ui.menu.Button('Log out');
            menu.add(logoutButton);
            logoutButton.addListener('execute', this._logoutCommand, this);

            return menu;
        },

        getHelpMenu : function()
        {
            var menu = new qx.ui.menu.Menu();
            var manualButton = new qx.ui.menu.Button('Support Web site');
            var keyButton = new qx.ui.menu.Button(
                'Keyboard commands and shortcuts...');
            var aboutButton = new qx.ui.menu.Button('About...');

            manualButton.addListener('execute', this._manualCommand, this);
            aboutButton.addListener('execute', this._aboutCommand, this);
            keyButton.addListener('execute', this._keyCommand, this);

            menu.add(manualButton);
            menu.add(keyButton);
            menu.addSeparator();
            menu.add(aboutButton);

            return menu;
        },

        getForumMenu : function()
        {
            var menu = new qx.ui.menu.Menu();
            var createButton = new qx.ui.menu.Button('Create new group...');
            var joinButton = new qx.ui.menu.Button('Join existing group...');

            createButton.addListener('execute', this._createForumCommand, this);
            joinButton.addListener('execute', this._joinForumCommand, this);

            menu.add(createButton);
            menu.add(joinButton);

            return menu;
        },

        getViewMenu : function()
        {
            var menu = new qx.ui.menu.Menu();
            var logsButton = new qx.ui.menu.Button('Show logs...');
            var arrangeButton = new qx.ui.menu.Button('Tile windows');

            logsButton.addListener('execute', this._logsCommand, this);
            arrangeButton.addListener(
                'execute',
                this._controller.tileWindows,
                this._controller);

            if (this.anonUser === false) {
                menu.add(logsButton);
            }
            menu.add(arrangeButton);

            return menu;
        },

        getSettingsMenu : function()
        {
            var menu = new qx.ui.menu.Menu();
            var sslButton = new qx.ui.menu.CheckBox('Always use HTTPS');
            var fontButton = new qx.ui.menu.CheckBox('Small font');
            var arrangeButton = new qx.ui.menu.CheckBox(
                'Auto-arrange windows at startup');

            if (this.settings.getSslEnabled() === 1) {
                sslButton.setValue(true);
            }
            if (this.settings.getLargeFonts() === '0') {
                fontButton.setValue(true);
            }
            if (this.settings.getAutoArrange() === 1) {
                arrangeButton.setValue(true);
            }

            sslButton.addListener('changeValue', this._sslCommand, this);
            fontButton.addListener('changeValue', this._fontCommand, this);
            arrangeButton.addListener('changeValue', this._autoArrangeCommand,
                                      this);

            if (this.anonUser === false) {
                menu.add(sslButton);
            }
            menu.add(fontButton);
            menu.add(arrangeButton);

            return menu;
        },

        getAdvancedMenu : function()
        {
            var menu = new qx.ui.menu.Menu();
            var joinButton = new qx.ui.menu.Button('Join IRC channel...');

            joinButton.addListener('execute', this._joinIRCCommand, this);
            menu.add(joinButton);

            return menu;
        },

        _joinIRCCommand : function()
        {
            this.infoDialog.getJoinNewChannelWin(this.__myapp, 1);
        },

        _logsCommand : function()
        {
            this.logDialog.show(this.__myapp, this.desktop.getBounds());
        },

        _joinForumCommand : function()
        {
            this.infoDialog.getJoinNewChannelWin(this.__myapp, 0);
        },

        _createForumCommand : function()
        {
            this.infoDialog.getCreateNewGroupWin(this.__myapp);
        },

        _sslCommand : function(e)
        {
            var usessl = e.getData();

            if (usessl === true) {
                this.settings.setSslEnabled(1);
                qx.bom.Cookie.set('UseSSL', 'yes', 100, '/');
            } else {
                this.settings.setSslEnabled(0);
                qx.bom.Cookie.set('UseSSL', 'no', 100, '/');
            }

            new mas.Dialog().set({
                caption: 'Info',
                text: 'The application is now being reloaded to activate<br>' +
                    'the change.',
                yesLabel: 'OK',
                yesCb: function() {
                    window.location.reload(true);
                }
            }).open();
        },

        _fontCommand : function(e)
        {
            var smallfonts = e.getData();

            if (smallfonts === true) {
                this.settings.setLargeFonts('0');
            } else {
                this.settings.setLargeFonts('1');
            }

            this.updateFonts();
        },

        _autoArrangeCommand : function(e)
        {
            var autoarrange = e.getData();

            if (autoarrange === true) {
                this.settings.setAutoArrange(1);
            } else {
                this.settings.setAutoArrange(0);
            }
        },

        updateFonts : function()
        {
            for (var i = 0; i < this.windows.length; i++) {
                if (typeof(this.windows[i]) !== 'undefined') {
                    this.windows[i].setFonts(this.settings.getLargeFonts());
                }
            }
        },

        _logoutCommand : function()
        {
            this.rpc.call('LOGOUT', '');

            //TODO: create LOGOUTOK response and move this to there:
            qx.event.Timer.once(function() {
                qx.bom.Cookie.del('ProjectEvergreen', '/');
                window.location.reload(true);
            }, this, 1500);
        },

        _manualCommand : function()
        {
            var newWindow = window.open('/support.html', '_blank');
            newWindow.focus();
        },

        _aboutCommand : function()
        {
            new mas.Dialog().set({
                caption: 'About',
                text: '<br><br><br><center><img src="/i/mas_logo_small.png">' +
                    '</center><p><b><br><br><center><h2 style="color: ' +
                    '#000022;">MeetAndSpeak Web Client</center></h2></b>' +
                    '<p><center>Version: __MOE_VERSION__</center><br>' +
                    '<p style="padding-bottom:1px;">&copy; 2010-2013 ' +
                    '<a href="/about.html">MeetAndSpeak Ltd</a>. All ' +
                    'rights reserved.</p><br><br>',
                yesLabel: 'OK'
            }).open();
        },

        _keyCommand : function()
        {
            new mas.Dialog().set({
                caption: 'Shortcuts',
                text: '<b>Keyboard shortcuts:</b><p><table border=0><tr><td>' +
                    '[TAB]</td><td>= nick name completion</td></tr><tr><td>' +
                    '[Arrow Up]</td><td>= Switch to next visible window</td>' +
                    '</tr><tr><td>[Arrow Down]</td><td>= Switch to previous ' +
                    'visible windows</td></tr></table><p>To send a ' +
                    'notification to others in the group, start your line<br>' +
                    'with an exclamation mark "!" followed by a space ' +
                    'character. You can delete received<br>notifications ' +
                    'whenever you like by double-clicking them.<p>' +
                    'Notifications are handy as they stay always visible. ' +
                    'You can<br>be sure that everyone will see them.<p>' +
                    'See other available commands by typing<br>"/help" in ' +
                    'any of the windows.',
                yesLabel: 'OK'
            }).open();
        }
    }
});
