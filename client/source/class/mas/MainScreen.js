//
//   Copyright 2009-2014 Ilkka Oksanen <iao@iki.fi>
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

qx.Class.define('mas.MainScreen', {
    extend: qx.ui.container.Composite,

    construct: function(
        xhr, logDialog, settings, anonUser, friendsPopUp, controller) {
        this.base(arguments);

        this._xhr = xhr;
        this._logDialog = logDialog;
        this._settings = settings;
        this._anonUser = anonUser;
        this._controller = controller;
        this._friendsPopUp = friendsPopUp;

        this.setLayout(new qx.ui.layout.Canvas());

        this.__topictimer = new qx.event.Timer(1000);
        this.__topictimer.addListener('interval', function() {
            // There seems to be a bug in qooxdoo, one event can come after the
            // timer is stopped
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

        qx.bom.Element.addListener(window, 'focus', function() {
            qx.event.Timer.once(function(){
                document.title = 'MeetAndSpeak';
            }, this, 500);

            if (this.__topictimeractive === true) {
                this.__topictimer.stop();
                this.__topictimeractive = false;
            }
        }, this);
    },

    members: {
        desktop: 0,
        blocker: 0,

        _xhr: 0,
        _settings: 0,
        _logDialog: null,
        _anonUser: 0,
        _friendsPopUp: null,
        _contactsButton: 0,
        _rootContainer: 0,

        __statusBar: 0,
        __topictimer: 0,
        __topicstate: 0,
        __topictimeractive: 0,
        __msgvisible: false,

        show: function() {
            // Root widget
            this._rootContainer = new qx.ui.container.Composite(
                new qx.ui.layout.VBox(0)).set({
                backgroundColor: '#717172',
                padding: 0
            });

            // Desktop
            this.desktop = new qx.ui.window.Desktop(
                new qx.ui.window.Manager()).set({
                decorator: 'background2',
                backgroundColor: '#DFE5E5'
            });

            this.desktop.addListener(
                'resize', this._controller.checkLimits, this);

            var middleSection = new qx.ui.container.Composite(
                new qx.ui.layout.HBox(0));
            middleSection.add(this.desktop, { flex: 1 });
            this._rootContainer.add(middleSection, { flex: 1 });

            this.blocker = new qx.ui.core.Blocker(this.desktop).set({
                opacity: 0.5,
                color: 'black'
            });

            // Toolbar
            var toolbar = new qx.ui.toolbar.ToolBar().set({
                maxHeight: 40,
                spacing: 30
            });

            var part2 = new qx.ui.toolbar.Part();
            var part3 = new qx.ui.toolbar.Part();

            toolbar.add(part2);
            toolbar.addSpacer();

            var menuButton = new qx.ui.toolbar.MenuButton(
                'Menu', null, this.getMainMenu());
            part3.add(menuButton);

            if (this._anonUser === false) {
                this._contactsButton = new qx.ui.toolbar.CheckBox(
                    '<span style="color:#000000">Contacts...</span>');
                this._contactsButton.setRich(true);
                part3.add(this._contactsButton);

                this._contactsButton.addListener('changeValue', function (e) {
                    if (e.getData() === true) {
                        this._friendsPopUp.show();
                        this._friendsPopUp.placeToWidget(this._contactsButton);
                    } else {
                        this._friendsPopUp.hide();
                    }
                }, this);

                toolbar.add(part3);
            }

            this._rootContainer.add(toolbar);
            this.add(this._rootContainer, { width: '100%', height: '100%' });

            //Status bar
            this.__statusBar = new qx.ui.basic.Label('').set({
                backgroundColor: '#ff0000',
                zIndex: 100,
                textColor: '#ffffff',
                font: new qx.bom.Font(23, ['Arial', 'sans-serif']),
                padding: 14
            });

            this.__statusBar.hide();
            this.add(this.__statusBar, { left: 100, top: 0 });
        },

        updateContactsLabel: function(value) {
            var onlineText = '';

            if (value > 0) {
                onlineText = '<span style="color:#000000">(</span>' +
                    '<span style="color:#254117">' + value +
                    '</span><span style="color:#000000">)</span>';
            }

            this._contactsButton.setLabel(
                '<span style="color:#000000">Contacts...</span> ' +
                    onlineText);
        },

        getMainMenu: function() {
            var menu = new qx.ui.menu.Menu();

            var forumMenu = new qx.ui.menu.Button(
                'Groups', null, null, this.getForumMenu());
            var viewMenu = new qx.ui.menu.Button(
                'View', null, null, this.getViewMenu());
            var settingsMenu = new qx.ui.menu.Button(
                'Settings', null, null, this.getSettingsMenu());
            var advancedMenu = new qx.ui.menu.Button(
                'Advanced', null, null, this.getAdvancedMenu());
            var helpMenu = new qx.ui.menu.Button(
                'Help', null, null, this.getHelpMenu());
            var logoutMenu = new qx.ui.menu.Button(
                'Log Out', null, null, this.getLogoutMenu());

            if (this._anonUser === false) {
                menu.add(forumMenu);
            }

            menu.add(viewMenu);
            menu.add(settingsMenu);

            if (this._anonUser === false) {
                menu.add(advancedMenu);
            }

            menu.add(helpMenu);
            menu.add(logoutMenu);

            return menu;
        },

        setStatusText: function(text) {
            if (text === '') {
                this.__statusBar.hide();
            } else {
                this.__statusBar.setValue(text);
                this.__statusBar.show();
            }
        },

        showFriendRequest: function(message) {
            var friendId = message.friendId;
            var friendNick = message.friendNick;
            var friendName = message.friendName;

            if (this.__msgvisible === false) {
                this.msg = new qx.ui.container.Composite(
                    new qx.ui.layout.HBox(8)).set({
                    padding: [5, 15, 5, 15],
                    backgroundColor: 'yellow'
                });

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
                    this._xhr.call('OKF', friendId);
                    this._rootContainer.remove(this.msg);
                    this.__msgvisible = false;
                }, this);

                decline.addListener('click', function () {
                    this._xhr.call('NOKF', friendId);
                    this._rootContainer.remove(this.msg);
                    this.__msgvisible = false;
                }, this);

                this.msg.add(accept);
                this.msg.add(decline);
                this.__msgvisible = true;

                this._rootContainer.addAt(this.msg, 1, {flex:0});
            }
            // else ignore command
        },

        getLogoutMenu: function() {
            var menu = new qx.ui.menu.Menu();
            var logoutButton = new qx.ui.menu.Button('Log out');
            menu.add(logoutButton);
            logoutButton.addListener('execute', this._logoutCommand, this);

            return menu;
        },

        getHelpMenu: function() {
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

        getForumMenu: function() {
            var menu = new qx.ui.menu.Menu();
            var createButton = new qx.ui.menu.Button('Create new group...');
            var joinButton = new qx.ui.menu.Button('Join existing group...');

            createButton.addListener('execute', this._createForumCommand, this);
            joinButton.addListener('execute', this._joinForumCommand, this);

            menu.add(createButton);
            menu.add(joinButton);

            return menu;
        },

        getViewMenu: function() {
            var menu = new qx.ui.menu.Menu();
            var logsButton = new qx.ui.menu.Button('Show logs...');
            var arrangeButton = new qx.ui.menu.Button('Tile windows');

            logsButton.addListener('execute', this._logsCommand, this);
            arrangeButton.addListener(
                'execute',
                this._controller.tileWindows,
                this._controller);

            if (this._anonUser === false) {
                menu.add(logsButton);
            }
            menu.add(arrangeButton);

            return menu;
        },

        getSettingsMenu: function() {
            var menu = new qx.ui.menu.Menu();
            var sslButton = new qx.ui.menu.CheckBox('Always use HTTPS');
            var fontButton = new qx.ui.menu.CheckBox('Small font');
            var arrangeButton = new qx.ui.menu.CheckBox(
                'Auto-arrange windows at startup');

            if (this._settings.getSslEnabled() === 1) {
                sslButton.setValue(true);
            }
            if (this._settings.getLargeFonts() === '0') {
                fontButton.setValue(true);
            }
            if (this._settings.getAutoArrange() === 1) {
                arrangeButton.setValue(true);
            }

            sslButton.addListener('changeValue', this._sslCommand, this);
            fontButton.addListener('changeValue', this._fontCommand, this);
            arrangeButton.addListener('changeValue', this._autoArrangeCommand,
                                      this);

            if (this._anonUser === false) {
                menu.add(sslButton);
            }
            menu.add(fontButton);
            menu.add(arrangeButton);

            return menu;
        },

        getAdvancedMenu: function() {
            var menu = new qx.ui.menu.Menu();
            var joinButton = new qx.ui.menu.Button('Join IRC channel...');

            joinButton.addListener('execute', this._joinIRCCommand, this);
            menu.add(joinButton);

            return menu;
        },

        _joinIRCCommand: function() {
            var that = this;

            new mas.JoinDialog().set({
                joinCb: function(name, pw, selectedNw) {
                    that._xhr.call('JOIN', name + ' ' + selectedNw + ' ' + pw);
                },
                mode: 'IRC'
            }).open();
        },

        _logsCommand: function() {
            // Fix me
            //this._logDialog.show(this.__myapp, this.desktop.getBounds());
        },

        _joinForumCommand: function() {
            var that = this;

            new mas.JoinDialog().set({
                joinCb: function(name, pw, selectedNw) {
                    that._xhr.call('JOIN', name + ' ' + selectedNw + ' ' + pw);
                },
                mode: 'MASGROUP'
            }).open();
        },

        _createForumCommand: function() {
            var that = this;

            new mas.CreateDialog().set({
                createCb: function(name, pw) {
                    that._xhr.call('CREATE', name + ' ' + pw);
                }
            }).open();
        },

        _sslCommand: function(e) {
            var usessl = e.getData();

            if (usessl === true) {
                this._settings.setSslEnabled(1);
                qx.bom.Cookie.set('UseSSL', 'yes', 100, '/');
            } else {
                this._settings.setSslEnabled(0);
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

        _fontCommand: function(e) {
            var smallfonts = e.getData();

            if (smallfonts === true) {
                this._settings.setLargeFonts('0');
            } else {
                this._settings.setLargeFonts('1');
            }

            this.updateFonts();
        },

        _autoArrangeCommand: function(e) {
            var autoarrange = e.getData();

            if (autoarrange === true) {
                this._settings.setAutoArrange(1);
            } else {
                this._settings.setAutoArrange(0);
            }
        },

        updateFonts: function() {
            for (var i = 0; i < this.windows.length; i++) {
                if (typeof(this.windows[i]) !== 'undefined') {
                    this.windows[i].setFonts(this._settings.getLargeFonts());
                }
            }
        },

        _logoutCommand: function() {
            this._xhr.call('LOGOUT', '');

            //TODO: create LOGOUTOK response and move this to there:
            qx.event.Timer.once(function() {
                qx.bom.Cookie.del('ProjectEvergreen', '/');
                window.location.reload(true);
            }, this, 1500);
        },

        _manualCommand: function() {
            var newWindow = window.open('/support.html', '_blank');
            newWindow.focus();
        },

        _aboutCommand: function() {
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

        _keyCommand: function() {
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
