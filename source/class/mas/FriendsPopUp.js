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

qx.Class.define('mas.FriendsPopUp', {
    extend: qx.ui.popup.Popup,

    construct: function(addContactCb, startChatCb, cbCtx) {
        this.base(arguments);
        this._addContactCb = addContactCb;
        this._startChatCb = startChatCb;
        this._cbCtx = cbCtx;

        this.setLayout(new qx.ui.layout.HBox(5));

        this.set({
            autoHide: false,
            height: 400,
            width: 250
        });

        var friendScroll = new qx.ui.container.Scroll().set({
            backgroundColor: '#e2e5eE',
            padding: [0, 0, 5, 0],
            scrollbarX: 'auto',
            scrollbarY: 'auto'
        });


        var friendContainer = new qx.ui.container.Composite(
            new qx.ui.layout.VBox()).set({
                backgroundColor: '#e2e5eE'
            });

        var friendsLabel = new qx.ui.basic.Label(
            '<b>Contact list:</b>').set({
                font : new qx.bom.Font(14, ['Arial', 'sans-serif']),
                textColor: '#cc448b',
                rich: true,
                padding: [10, 0, 10, 10]
            });

        friendContainer.add(friendsLabel);

        var fgrid = new qx.ui.layout.Grid();
        this._flist = new qx.ui.container.Composite(fgrid).set({
            allowGrowX: true,
            allowGrowY: true
        });
        fgrid.setColumnWidth(0, 185);

        friendContainer.add(this._flist, { flex: 1 });

        var addContainer = new qx.ui.container.Composite(
            new qx.ui.layout.HBox());

        this.__input1 = new qx.ui.form.TextField().set({
            placeholder: '<nickname>',
            margin: [10, 0, 8, 8]
        });

        addContainer.add(this.__input1, { flex: 1 });
        addContainer.add(new qx.ui.core.Spacer(8));

        var addButton = new qx.ui.form.Button('Add').set({
            margin: [10, 8, 8, 0]
        });

        addContainer.add(addButton);
        friendContainer.add(addContainer);

        addButton.addListener('execute', function () {
            this._addContactCb.call(this._cbCtx, this.__input1.getValue());
            this.__input1.setValue('');
        }, this);

        friendScroll.add(friendContainer);
        this.add(friendScroll, { flex: 1 });

        this._timer = new qx.event.Timer(1000 * 60);
        this._timer.addListener(
            'interval', function() {
                this.updateIdleTimes(this._flist);
            }, this);
        this._timer.start();
    },

    members: {
        _timer: null,
        _flist: null,
        _addContactCb: null,
        _startChatCb: null,
        _cbCtx: null,

        updateIdleTimes : function() {
            var children = this._flist.getChildren();

            for (var i = 1; i < children.length; i = i + 3) {
                if (children[i].idleTime !== 0) {
                    children[i].idleTime++;
                }
            }

            this.printIdleTimes();
        },

        updateFriendsList : function(model) {
            this._flist.removeAll();

            if (model.list.length === 0) {
                var nofriends = new qx.ui.basic.Label(
                    'No friends added<p>You can add new contacts by<br> using' +
                        'the field below<br>or by right-clicking <br>a name ' +
                        'in any group window.<p>You can send messages <br>' +
                        'and see status information<br> of your friends.').set({
                            rich: true,
                            paddingLeft: 10
                        });

                this._flist.add(nofriends, { row: 0, column: 0 });
            }

            var that = this;

            var click = function() {
                that._startChatCb.call(that._cbCtx, this.nickname);
            };

            var mouseOver = function() {
                this.setValue('<font color="green"><u>|chat|<u></font>');
            };

            var mouseOut = function() {
                this.setValue('<font color="green">|chat|</font>');
            };

            var toolTip = new qx.ui.tooltip.ToolTip('Send Message');
            var row = 0;

            for (var i in model.list) {
                var name = new qx.ui.basic.Label(
                    '<b>' + model.list[i].name + '</b>&nbsp;(' +
                        model.list[i].nick + ')').set({
                            rich: true,
                            padding: [7, 0, 0, 10]
                        });

                var idleInfo = new qx.ui.basic.Label().set({
                    rich: true,
                    padding: [0, 0, 0, 20]
                });

                var chatButton = new qx.ui.basic.Label(
                    '<font color="green">|chat|</font>').set({
                        rich: true,
                        toolTip: toolTip,
                        padding: [7, 0, 0, 10]
                    });

                chatButton.nickname = model.list[i].nick;
                chatButton.mainscreen = this;

                chatButton.addListener('click', click, chatButton);
                chatButton.addListener('mouseover', mouseOver, chatButton);
                chatButton.addListener('mouseout', mouseOut, chatButton);

                idleInfo.idleTime = model.list[i].idleTime;

                this._flist.add(name, { row: 2 * row, column: 0 });
                this._flist.add(idleInfo, { row: 2 * row + 1, column: 0,
                                           colSpan : 2 });
                this._flist.add(chatButton, { row: 2 * row, column: 1 });

                var online = 2;

                if(idleInfo.idleTime === 0) {
                    online = 1;
                }

                row++;
            }

            this.printIdleTimes();
        },

        printIdleTimes : function() {
            var children = this._flist.getChildren();

            for (var i = 1; i < children.length; i = i + 3) {
                var idle = children[i].idleTime;
                var result;

                if (idle === 0) {
                    result = '<font color="green">ONLINE<font>';
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
                    if (idle === 0) {
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
        }
    }
});
