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

qx.Class.define('mas.Controller',
{
    extend : qx.core.Object,

    construct : function(startLabel, root) {
        this._startLabel = startLabel;
        this._root = root;

        var cookie = qx.bom.Cookie.get('ProjectEvergreen');

        if (!cookie) {
            window.location = '/';
        } else if (cookie.split('-')[2] === 'a') {
            this._anonUser = true;
        }

        // Utilities
        this._xhr = new mas.XHR(
            this, this.processMessage, this.handleError, this.handleRpcError,
            this.setStatusText);
        this._audio = new mas.Audio();
        this._settings = new mas.Settings(this._xhr, '');

        // Views
        this._logDialog = new mas.LogDialog(
            this, this._settings, this.handleLogSeek);
        this._mainScreen = new mas.MainScreen(
            this._xhr, root, this._logDialog, this._settings, this._anonUser,
            this);
        this._friendsPopUp = new mas.FriendsPopUp();
    },

    members :
    {
        nicks : [],
        initdone : false,

        _startLabel : 0,
        _root: null,
        _anonUser : false,

        _xhr : null,
        _audio : null,
        _settings : null,

        _logDialog : null,
        _mainScreen : null,
        _friendsPopUp : null,

        _windows : {},

        processMessage : function(message) {
            switch(message.id) {
            case 'CREATE':
                this.createOrUpdateWindow(message, true);
                break;

            case 'UPDATE':
                this.createOrUpdateWindow(message, false);
                break;

            case 'INITDONE':
                this.handleInitDone();
                break;

            case 'ADDTEXT':
                this._windows[message.window].addline(message, true, false);

                if (this._windows[message.window].sound === 1 &&
                    message.type === 2 && this.initdone === 1) {
                    // Play short sound
                    this._audio.play();
                }

                if (this.__blur === 1 &&
                    this._windows[message.window].titlealert === 1 &&
                    this.__topictimer.getEnabled() === false &&
                    this.__firstCommand !== 1 && message.type === 2) {
                    this.__topictimeractive = true;
                    // Flash [MSG] text on the browser title bar
                    this.__topictimer.start();
                }
                break;

            case 'ADDNTF':
                this._windows[message.window].addntf(
                    message.noteId, message.body);
                break;

            case 'REQF':
                this._mainScreen.showFriendRequest(message);
                break;

            case 'TOPIC':
                this._windows[message.window].changetopic(message.topic);
                break;

            case 'NAMES':
                this._windows[message.window].addnames(message.names);
                break;

            case 'ADDNAME':
                this._windows[message.window].addname(message.nick);
                break;

            case 'DELNAME':
                this._windows[message.window].delname(message.nick);
                break;

            case 'NICK':
                this.nicks = message.nicks;
                break;

            case 'ADDURL':
                this._windows[message.window].addUrl(message.url);
                break;

            case 'INFO' :
                var text = message.text;

                //TODO: big bad hack, fix: proper protocol
                if (text.substr(0, 30) === 'You are already chatting with ') {
                    this.removeWaitText(text.substr(30));
                }

                new mas.Dialog().set({
                    caption: 'Info',
                    text: text,
                    yesLabel: 'OK'
                }).open();
                break;

            case 'CLOSE':
                //TODO: call destructor?
                delete this._windows[message.window];
                break;

            case 'FLIST':
                this._friendsPopUp.updateFriendsList(message);
                break;

            case 'SET':
                this._settings.update(message.settings);
                // We have settings now, update the status message
                this._startLabel.setValue(
                    '<center><br><br><br>Rendering</center>');
                this._mainScreen.show();
                break;

            case 'KEY':
                this._windows[message.window].apikey.setValue(message.key);
                break;

            case 'OPERLIST':
                this._windows[message.window].updateOperList(message);
                break;

            case 'BANLIST':
                this._windows[message.window].updateBanList(message);
                break;

            case 'LOGS':
                this._logDialog.sendresult(message);
                break;

            default:
                debug.print('ERROR: Unknown command: ' + message);
                break;
            }

            this.__firstCommand = 0;
        },

        handleRpcError : function() {
            var problemLabel = new qx.ui.basic.Label(
                '<center>MeetAndSpeak is having some technical problems. ' +
                    'Sorry!<br><br>You can try to reload this page in a few ' +
                    'moments to see if the service is back online.<br><br>We ' +
                    'are trying to address the situation as quickly as ' +
                    'possible.</center>').set({
                        font : new qx.bom.Font(14, [ 'Arial', 'sans-serif' ]),
                        width: 500,
                        height: 150,
                        rich: true
                    });

            var marginX = Math.round(qx.bom.Viewport.getWidth() / 2) - 500 / 2;
            var marginY = Math.round(qx.bom.Viewport.getHeight() / 2) - 100;

            problemLabel.setMargin(marginY, 10, 10, marginX);
            this._root.removeAll();
            this._root.add(problemLabel);
        },

        handleError : function(code) {
            if (code === 'DIE') {
                if (this.desktop === 0) {
                    this.show();
                }

                new mas.Dialog().set({
                    caption: 'Error',
                    text: 'Session expired. <p>Press OK to login again.',
                    yesLabel: 'OK',
                    yesCb: function () {
                        qx.bom.Cookie.del('ProjectEvergreen', '/');
                        window.location = '/';
                    }
                }).open();
            } else if (code ===  'EXPIRE') {
                if (this.desktop === 0) {
                    this.show();
                }

                //var reason = param.slice(pos+1);
                new mas.Dialog().set({
                    caption: 'Error',
                    text: 'Your session expired, you logged in from another ' +
                        'location, or<br>the server was restarted.<p>Press ' +
                        'OK to restart.',
                    yesLabel: 'OK',
                    yesCb: function() {
                        window.location = '/';
                    }
                }).open();
            }
        },

        handleInitDone : function() {
            this.initdone = 1;

            for (var window in this._windows) {
                this._windows[window].displayWindowContent();
            }

            var groupCookie = qx.bom.Cookie.get('ProjectEvergreenJoin');

            if (groupCookie !== null) {
                var data = groupCookie.split('-');
                qx.bom.Cookie.del('ProjectEvergreenJoin', '/');

                new mas.Dialog().set({
                    caption: 'Confirm',
                    text: 'Do you want to join the group ' + data[0] + '?',
                    yesLabel: 'Yes',
                    yesCb: function() {
                        this._xhr.call(
                            'JOIN', data[0] + ' MeetAndSpeak ' + data[1]);
                    },
                    noLabel: 'No'
                }).open();
            }

            this.tileWindows();

            // Temporary announcement system
            if (qx.bom.Cookie.get('msg5') === null) {
                qx.bom.Cookie.set('msg5', 'yes', 1000, '/');
                //new mas.Dialog()...
            }
        },

        handleLogSeek : function(pos) {
            debug.print('Seeking logs: ' + pos);
            this._xhr.call('GETLOG', pos);

        },

        createOrUpdateWindow : function(message, create) {
            var windowId = message.window;
            var nw = message.nwName;
            var nwId = message.nwId;
            var name = message.chanName;
            var type = message.chanType;
            var sound = message.sounds;
            var titlealert = message.titleAlert;
            var usermode = message.userMode;
            var visible = message.visible;
            var newMsgs = message.newMsgs;
            var password = message.password;
            var topic = message.topic;

            if (create === true) {
                var newWindow = new mas.UserWindow(
                    this._xhr, this.desktop, topic, nw, name, type,
                    sound, titlealert, nwId, usermode, password, newMsgs,
                    windowId, this);
                //TODO: Inherit UserWindow from Window.
                this._mainScreen.desktop.add(newWindow.window);

                if (type !== 0 && this.initdone === 1) {
                    this.removeWaitText(name);
                }

                if (message.x < 0) {
                    message.x = 0;
                }

                if (message.y < 0) {
                    message.y = 0;
                }

                if (message.height === -1) {
                    message.height = Math.round(
                        qx.bom.Document.getHeight() * 0.7);
                    message.width = Math.round(
                        qx.bom.Document.getWidth() * 0.7);
                }

                var dim = this._mainScreen.desktop.getBounds();

                if (dim && message.x + message.width > dim.width) {
                    if (message.width < dim.width) {
                        message.x = dim.width - message.width;
                    } else {
                        message.x = 5;
                        message.width = dim.width - 10;
                    }
                }

                if (dim && message.y + message.height > dim.height) {
                    if (message.height < dim.height) {
                        message.y = dim.height - message.height;
                    } else {
                        message.y = 5;
                        message.height = dim.height - 10;
                    }
                }

                newWindow.moveTo(message.x, message.y);
                newWindow.setHeight(message.height);
                newWindow.setWidth(message.width);

                this._windows[windowId] = newWindow;
                newWindow.show();

                newWindow.addHandlers();
            } else {
                if (this._windows[windowId]) {
                    this._windows[windowId].updateValues(
                        topic, nw, name, type, sound, titlealert,
                        nwId, usermode, password);
                }
            }

            this._windows[windowId].setFonts(this._settings.getLargeFonts());

            if (create === true) {
                this.tileWindows();
            }
        },

        checkLimits : function(e) {
            for (var window in this._windows) {
                var wbounds = this._windows[window].getBounds();
                var dim = e.getData();
                var x = wbounds.left;
                var y = wbounds.top;
                var width = wbounds.width;
                var height = wbounds.height;

                if (x + width > dim.width) {
                    if (width < dim.width) {
                        x = dim.width - width;
                    } else {
                        x = 5;
                        width = dim.width - 10;
                    }
                }

                if (y + height > dim.height) {
                    if (height < dim.height) {
                        y = dim.height - height;
                    } else {
                        y = 5;
                        height = dim.height - 10;
                    }
                }

                if (x !== wbounds.left || y !== wbounds.top) {
                    this._windows[window].moveTo(x, y);
                }

                if (width !== wbounds.width) {
                    this._windows[window].setWidth(width);
                }

                if  (height !== wbounds.height) {
                    this._windows[window].setHeight(height);
                }
            }
        },

        tileWindows : function() {
            if (this._settings.getAutoArrange() === 0) {
                return;
            }

            var x=[0,1,2,3,2,3,3,3,3,3,4,4,4,4,4,4,4];
            var y=[0,1,1,1,2,2,2,3,3,3,3,3,4,4,4,4,4];
            var amount = 0;

            this._mainScreen.blocker.block();

            qx.event.Timer.once(function() {
                for (var window in this._windows) {
                    amount++;
                }

                var dim = this._mainScreen.desktop.getBounds();

                if (amount === 0 || amount > 16) {
                    this._mainScreen.blocker.unblock();
                    debug.print('Can\'t tile windows');
                    return;
                }

                var width = Math.floor(
                    (dim.width - (3 * (x[amount] + 1))) / x[amount]);
                var height = Math.floor(
                    ((dim.height - 10) - (3 * (y[amount] + 1))) / y[amount]);

                var cx = 0;
                var cy = 0;
                var current = 0;

                for (var window in this._windows) {
                    current++;

                    this._windows[window].moveTo(
                        3 * (cx + 1) + cx * width, 3 * (cy + 1) + cy *
                            height + 5);
                    this._windows[window].setHeight(height);

                    if (current === amount) {
                        var missing = x[amount] * y[amount] - amount;
                        width = width + missing * width + 3 * missing;
                    }

                    this._windows[window].setWidth(width);
                    this._windows[window].scrollToBottom();
                    cx++;

                    if (cx === x[amount]) {
                        cx = 0;
                        cy++;
                    }
                }

                this._mainScreen.blocker.unblock();
            }, this, 10);
        },

        setStatusText : function(text) {
            this._mainscreen.setStatusText(text);
        }
    }
});
