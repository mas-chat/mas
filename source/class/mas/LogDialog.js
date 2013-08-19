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

// Can't use strict because of Qooxdoo
// 'use strict';

qx.Class.define('mas.LogDialog',
{
    extend : qx.core.Object,

    construct : function(ctx, settings, infodialog, seekCb)
    {
        this.base(arguments);

        this._settings = settings;
        this._infoDialog = infodialog;
        this._seekCb = seekCb;
        this._cbCtx = ctx;
    },

    members :
    {
        _today : 0,
        _weeks : 0,
        _errorMsg : 0,
        _iframe : 0,
        _settings : 0,
        _window : 0,
        _pos : 0,
        _infoDialog : 0,
        _seekCb : null,
        _cbCtx: null,

        show : function(text, dim)
        {
            if (this._window === 0) {
                var width = 800;
                var height = 600;

                if (dim.width < 700 + 40 + 40) {
                    width = dim.width - 80;
                }

                if (dim.height < 400 + 40 + 40) {
                    width = dim.height - 80;
                }

                this._window = new qx.ui.window.Window('History Logs').set({
                    contentPadding: [10,10,10,10],
                    modal: true,
                    showClose: true,
                    width: width,
                    height: height
                });

                this._window.setLayout(new qx.ui.layout.VBox(5));

                var modearea = new qx.ui.container.Composite(
                    new qx.ui.layout.HBox(10, 'left'));

                var rbBrowse = new qx.ui.form.RadioButton('Browse');
                modearea.add(rbBrowse);

                var manager = new qx.ui.form.RadioGroup(rbBrowse);

                var hbox = new qx.ui.layout.HBox(10, 'left').set({
                    alignX: 'center'
                });

                var navarea = new qx.ui.container.Composite(hbox).set({
                    paddingBottom: 4
                });

                this._iframe = new qx.ui.embed.Iframe();

                this.b1 = new qx.ui.form.Button('Prev year');
                this.b2 = new qx.ui.form.Button('Prev month');
                this.b3 = new qx.ui.form.Button('Prev day');
                this.b4 = new qx.ui.form.Button('Next day');
                this.b5 = new qx.ui.form.Button('Next month');
                this.b6 = new qx.ui.form.Button('Next year');

                this.b1.addListener('execute', function() {
                    this.seek(365);
                }, this);

                this.b2.addListener('execute', function() {
                    this.seek(28);
                }, this);

                this.b3.addListener('execute', function() {
                    this.seek(1);
                }, this);

                this.b4.addListener('execute', function() {
                    this.seek(-1);
                }, this);

                this.b5.addListener('execute', function() {
                    this.seek(-28);
                }, this);

                this.b6.addListener('execute', function() {
                    this.seek(-365);
                }, this);

                this._today = new qx.ui.basic.Label().set({
                    alignY: 'middle',
                    minWidth: 100,
                    textAlign: 'center'
                });

                navarea.add(this.b1);
                navarea.add(this.b2);
                navarea.add(this.b3);
                navarea.add(this._today);
                navarea.add(this.b4);
                navarea.add(this.b5);
                navarea.add(this.b6);

                this._window.add(modearea);
                this._window.add(navarea);

                this._errorMsg = new qx.ui.basic.Label();
                this._errorMsg.setRich(true);
                this._window.add(this._errorMsg);

                var infoarea = new qx.ui.container.Composite(
                    new qx.ui.layout.HBox(10, 'left'));

                this.list = new qx.ui.form.List();
                this.list.add(new qx.ui.form.ListItem(''));
                this.list.setAllowGrowY(true);

                infoarea.add(this.list);
                infoarea.add(this._iframe, { flex : 1 });

                this._window.add(infoarea, { flex : 1 });

                this._weeks = new qx.ui.basic.Label().set({
                    marginRight: 35,
                    marginTop: 3
                });

                var logging = new qx.ui.basic.Label('Keep logs: ').set({
                    marginTop: 4,
                    marginRight: 15
                });

                manager.addListener('changeSelection', function () {
                    this._errorMsg.setValue('');
                    this.list.removeAll();
                    this._iframe.setSource('/tools/blank.pl');

                    this._window.addAt(navarea, 1);
                    this.seek(0);
                }, this);

                var logshort = new qx.ui.form.RadioButton('for last 7 days');
                logshort.setMarginRight(10);
                var loglong = new qx.ui.form.RadioButton(
                    'maximum time (currently forever)');

                var close = new qx.ui.form.Button('Close');
                close.setAlignX('right');

                close.addListener(
                    'execute', function() {
                        this._window.close();
                    }, this);

                close.setMarginLeft(20);

                var logbox = new qx.ui.container.Composite(
                    new qx.ui.layout.HBox());

                logbox.add(this._weeks);
                logbox.add(new qx.ui.core.Spacer(50), { flex : 1 });
                logbox.add(logging);
                logbox.add(logshort);
                logbox.add(loglong);
                logbox.add(close);

                this._window.add(logbox);

                new qx.ui.form.RadioGroup(logshort, loglong);

                if (this._settings.getLoggingEnabled() === 0) {
                    logshort.setValue(true);
                } else {
                    loglong.setValue(true);
                }

                var settings = this._settings;

                logshort.addListener('click', function() {
                    this._infoDialog.showInfoWin(
                        'Confirmation',
                        'Are you absolutely sure? All your log files older' +
                            '<br>than 7 days will be deleted!',
                        'OK',
                        function () {
                            settings.setLoggingEnabled(0);
                        },
                        'Cancel',
                        function () {
                            loglong.setValue(true);
                        }
                    );
                }, this);

                loglong.addListener('click', function() {
                    this.settings.setLoggingEnabled(1);
                }, this);

                this._window.setModal(true);

                this.seek(0);
                this._window.open();
            }

            this._window.center();
            this.updateLogLength();
            this._window.open();
        },

        sendresult : function(message)
        {
            var date = message.date;

            if (this._pos === 0) {
                date = 'Today';
            }

            this._today.setValue(date);

            var channels = message.windows;
            this.list.removeAll();

            if (channels.length === 0) {
                this._iframe.setSource(
                    '/tools/blank.pl?t=' +
                        escape('Nothing has been logged for this day.'));
            } else {
                var dateObj = new Date();
                var timezone = dateObj.getTimezoneOffset();

                for (var i=0; i < channels.length; i++) {
                    var tmp = new qx.ui.form.ListItem(channels[i].name);
                    tmp.chan = escape(channels[i].file);
                    tmp.date = channels[i].epochday;
                    tmp.tz = timezone;
                    tmp.st = '';
                    tmp.iframe = this._iframe;

                    tmp.addListener('click', function () {
                        this.iframe.setSource(
                            '/tools/get_day.pl?date=' + this.date + '&chan=' +
                                this.chan + '&tz=' + this.tz + '&st=');
                    }, tmp);

                    this.list.add(tmp);
                    this.list.setSelection([tmp]);
                }

                //auto load first item
                this._iframe.setSource(
                    '/tools/get_day.pl?date=' + channels[0].epochday +
                        '&chan=' + escape(channels[0].file) + '&tz=' +
                        timezone + '&st=');
            }

            this.b1.setEnabled(true);
            this.b2.setEnabled(true);
            this.b3.setEnabled(true);

            if (this._pos === 0) {
                this.b4.setEnabled(false);
            } else {
                this.b4.setEnabled(true);
            }

            if (this._pos < 28) {
                this.b5.setEnabled(false);
            } else {
                this.b5.setEnabled(true);
            }

            if (this._pos < 365) {
                this.b6.setEnabled(false);
            } else {
                this.b6.setEnabled(true);
            }
        },

        updateLogLength : function()
        {
            var firstDate = new Date('2/1/2010 0:00');
            var now = new Date();
            var numWeeks = (now.getTime() - firstDate.getTime()) /
                    (1000 * 60 * 60 * 24 * 7);
            numWeeks = Math.round(numWeeks * Math.pow(10, 3)) / Math.pow(10, 3);

            this.weeks.setValue('');
        },

        seek : function(days)
        {
            this._pos = this._pos + days;

            this.b1.setEnabled(false);
            this.b2.setEnabled(false);
            this.b3.setEnabled(false);
            this.b4.setEnabled(false);
            this.b5.setEnabled(false);
            this.b6.setEnabled(false);

            this._seekCb.call(this._cbCtx, this._pos);
        }
    }
});
