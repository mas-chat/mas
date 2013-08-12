//
//   Copyright 2013 Ilkka Oksanen <iao@iki.fi>
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

qx.Class.define('client.FriendsPopUp',
{
    extend : qx.core.Object,

    construct : function(srpc, rootItem, logDialog, settings, infoDialog,
                         anonUser)
    {
        this.base(arguments);

        var friendScroll = new qx.ui.container.Scroll();
        friendScroll.setPadding(0, 0, 5, 0);
        friendScroll.set({ backgroundColor: '#e2e5eE'});

        var friendContainer = new qx.ui.container.Composite(
            new qx.ui.layout.VBox());
        friendContainer.set({ backgroundColor: '#e2e5eE'});

        var friendsLabel = new qx.ui.basic.Label(
            '<b>Contact list:</b>').set({
                font : new qx.bom.Font(14, ['Arial', 'sans-serif']),
                textColor: '#cc448b'});

        friendsLabel.setRich(true);
        friendsLabel.setPaddingTop(10);
        friendsLabel.setPaddingBottom(10);
        friendsLabel.setPaddingLeft(10);

        friendContainer.add(friendsLabel);

        var fgrid = new qx.ui.layout.Grid();
        this._flist = new qx.ui.container.Composite(fgrid);
        this._flist.setAllowGrowY(true);
        this._flist.setAllowGrowX(true);
        fgrid.setColumnWidth(0, 185);

        friendContainer.add(this._flist, { flex: 1 });

        var addContainer = new qx.ui.container.Composite(
            new qx.ui.layout.HBox());

        this.__input1 = new qx.ui.form.TextField();
        this.__input1.setPlaceholder('<nickname>');
        this.__input1.setMarginTop(10);
        this.__input1.setMarginBottom(8);
        this.__input1.setMarginLeft(8);

        addContainer.add(this.__input1, { flex: 1 });
        addContainer.add(new qx.ui.core.Spacer(8));

        var button1 = new qx.ui.form.Button('Add');
        button1.setMarginTop(10);
        button1.setMarginBottom(8);
        button1.setMarginRight(8);
        addContainer.add(button1);

        friendContainer.add(addContainer);

        button1.addListener('execute', function () {
            this.rpc.call('ADDF', this.__input1.getValue());
                this.__input1.setValue('');
        }, this);

        //popup
        var contactsPopup = new qx.ui.popup.Popup(new qx.ui.layout.HBox(5));
        contactsPopup.set({ autoHide: true, height: 400, width: 250 });

        friendScroll.add(friendContainer);
        friendScroll.set({ scrollbarX: 'auto', scrollbarY: 'auto' });

        contactsPopup.add(friendScroll, { flex: 1 });

        contactsPopup.addListener('disappear', function (e) {
            contactsButton.setValue(false);
        });

        this._timer = new qx.event.Timer(1000 * 60);
        this._timer.addListener(
            'interval', function() { this.updateIdleTimes(
                this._flist); },
            this);
        this._timer.start();
    },

    members : {
        _timer : null,
        _flist : null,

        updateIdleTimes : function()
        {
            var children = this._flist.getChildren();

            for (var i = 0; i < children.length; i++) {
                if (children[i].idleTime !== 0) {
                    children[i].idleTime++;
                }
            }

            this.printIdleTimes(this._flist);
        },

        removeWaitText : function(nick)
        {
            if (!this._flist) {
                return;
            }

            var children = this._flist.getChildren();

            for (var i = 2; i < children.length; i = i + 3) {
                if (children[i].nickname === nick) {
                    children[i].setValue('<font color="green">|chat|</font>');
                }
            }
        },

        updateFriendsList : function(message)
        {
            this._flist.removeAll();

            if (message.list.length !== 0) {
                for (var i = 0; i < message.list.length; i++) {
                    var friendData = message.list[i];

                    var friend = new qx.ui.basic.Label(
                        '<b>' + friendData.name + '</b>&nbsp;(' +
                            friendData.nick + ')');
                    var friend2 = new qx.ui.basic.Label();
                    var friend3 = new qx.ui.basic.Label();

                    friend3.setRich(true);
                    friend3.setValue('<font color="green">|chat|</font>');
                    friend3.nickname = friendData.nick;
                    friend3.rrpc = this.rpc;
                    friend3.waiting = false;
                    friend3.mainscreen = this;

                    friend3.addListener('click', function () {
                        this.rrpc.call('STARTCHAT', 'MeetAndSpeak ' +
                                       this.nickname);
                        this.setValue('<font color="green">Wait..</font>');
                        this.waiting = true;
                    }, friend3);

                    friend3.addListener('mouseover', function () {
                        if (this.waiting === false) {
                            this.setValue(
                                '<font color="green"><u>|chat|<u></font>');
                        }
                    }, friend3);

                    friend3.addListener('mouseout', function () {
                        if (this.waiting === false) {
                            this.setValue('<font color="green">|chat|</font>');
                        }
                    }, friend3);

                    friend3.setToolTip(this.__tt);

                    friend2.setRich(true);
                    friend.setRich(true);

                    friend.setPaddingTop(7);
                    friend3.setPaddingTop(7);

                    friend2.setPaddingTop(0);
                    friend2.setPaddingLeft(20);
                    friend3.setPaddingLeft(10);
                    friend.setPaddingLeft(10);
                    friend2.idleTime = friendData.idleTime;

                    this._flist.add(friend, { row: 2*i, column: 0 });
                    this._flist.add(friend2, { row: 2 * i + 1, column: 0,
                                               colSpan : 2 });
                    this._flist.add(friend3, { row: 2 * i, column: 1 });

                    var online = 2;

                    if(friendData.idleTime === 0) {
                        online = 1;
                    }

                    //update groups also
                    for (var ii=0; ii < this.windows.length; ii++) {
                        if (typeof(this.windows[ii]) !== 'undefined') {
                            this.windows[ii].setUserStatus(friendData.nick,
                                                           online);
                        }
                    }
                }
            } else {
                var nofriends = new qx.ui.basic.Label(
                    'No friends added<p>You can add new contacts by<br> using' +
                        'the field below<br>or by right-clicking <br>a name ' +
                        'in any group window.<p>You can send messages <br>' +
                        'and see status information<br> of your friends.');
                nofriends.setRich(true);

                nofriends.setPaddingLeft(10);
                this._flist.add(nofriends, { row: 0, column: 0 });
            }

            this.printIdleTimes();
        },

        printIdleTimes : function()
        {
            var children = this._flist.getChildren();
            var online = 0;

            for (var i = 1; i < children.length; i = i + 3) {
                var idle = children[i].idleTime;
                var result;

                if (idle === 0) {
                    result = '<font color="green">ONLINE<font>';
                    online++;
                } else if (idle < 60) {
                    result = '<font color="blue">Last&nbsp;activity:&nbsp;' +
                        idle + '&nbsp;mins&nbsp;ago</font>';
                } else if (idle < 60 * 24) {
                    idle = Math.round(idle / 60);
                    if (idle === 0) {
                        idle = 1;
                    }

                    result = '<font color="blue">Last&nbsp;activity:&nbsp;' +
                        idle + '&nbsp;hours&nbsp;ago</font>';
                } else if (idle < 5000000) {
                    idle = Math.round(idle / 60 / 24);
                    if (idle === 0)
                    {
                        idle = 1;
                    }

                    result = '<font color="blue">Last&nbsp;activity:&nbsp;' +
                        idle + '&nbsp;days&nbsp;ago</font>';
                } else {
                    result = '<font color="blue">Last&nbsp;activity:</font>' +
                        '&nbsp;Unknown';
                }

                children[i].setValue(result);
            }

            var onlineText = '';

            if (online > 0) {
                onlineText = '<span style="color:#000000">(</span>' +
                    '<span style="color:#254117">' + online +
                    '</span><span style="color:#000000">)</span>';
            }

            // TODO: fix
            //this.contactsButton.setLabel(
            //    '<span style="color:#000000">Contacts...</span> ' +
            //        onlineText);
        }
    }
});
