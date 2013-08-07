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

qx.Class.define('client.LogDialog',
{
    extend : qx.core.Object,

    construct : function(srpc, settings, infodialog)
    {
        this.base(arguments);

        this.rpc = srpc;
        this.settings = settings;
        this.__rpclisa = new qx.io.remote.Rpc('/lisa/jsonrpc.pl', 'lisa.main');
        this.__infodialog = infodialog;
    },

    members :
    {
        rpc : 0,
        today : 0,
        weeks : 0,
        searchstring : '',
        searchInput : 0,
        settings : 0,
        mainscreen : null,
        iframe : 0,
        errormsg : 0,

        __window : 0,
        __rpclisa : 0,
        __pos : 0,
        __infodialog : 0,

        show : function(text, dim)
        {
            if (this.__window === 0) {
                this.__window = new qx.ui.window.Window('History Logs');
                this.__window.setLayout(new qx.ui.layout.VBox(5));
                this.__window.set({contentPadding: [10,10,10,10]});

                this.__window.setModal(true);
                this.__window.setShowClose(true);

                var width = 800;
                var height = 600;

                if (dim.width < 700 + 40 + 40) {
                    width = dim.width - 80;
                }

                if (dim.height < 400 + 40 + 40) {
                    width = dim.height - 80;
                }

                this.__window.setWidth(width);
                this.__window.setHeight(height);

                var modearea = new qx.ui.container.Composite(
                    new qx.ui.layout.HBox(10, 'left'));

                var rbSearch = new qx.ui.form.RadioButton('Search');
                var rbBrowse = new qx.ui.form.RadioButton('Browse');

                modearea.add(rbBrowse);
                modearea.add(rbSearch);

                var manager = new qx.ui.form.RadioGroup(rbBrowse, rbSearch);

                var hbox = new qx.ui.layout.HBox(10, 'left');
                hbox.setAlignX('center');
                var navarea = new qx.ui.container.Composite(hbox);
                navarea.setPaddingBottom(4);

                var hbox2 = new qx.ui.layout.HBox(10, 'left');
                hbox2.setAlignX('center');
                var searcharea = new qx.ui.container.Composite(hbox2);
                searcharea.setPaddingBottom(4);

                this.searchInput = new qx.ui.form.TextField();
                this.searchInput.set({ maxLength: 200, width: 350 });
                searcharea.add(this.searchInput);

                var iframe = new qx.ui.embed.Iframe();
                this.iframe = iframe;

                this.searchInput.addListener('keypress', function(e) {
                    if (e.getKeyIdentifier() === 'Enter') {
                        var input = this.searchInput.getValue();

                        if (input !== '' && input !== null) {
                            this.__startSearch();
                        }
                    }
                }, this);

                var button1 = new qx.ui.form.Button('Search');
                searcharea.add(button1);

                button1.addListener('execute', this.__startSearch, this);

                this.b1 = new qx.ui.form.Button('Prev year');
                this.b2 = new qx.ui.form.Button('Prev month');
                this.b3 = new qx.ui.form.Button('Prev day');
                this.b4 = new qx.ui.form.Button('Next day');
                this.b5 = new qx.ui.form.Button('Next month');
                this.b6 = new qx.ui.form.Button('Next year');

                this.b1.addListener(
                    'execute', function(e) {
                        this.seek(365);
                    }, this);

                this.b2.addListener(
                    'execute', function(e) {
                        this.seek(28);
                    }, this);

                this.b3.addListener(
                    'execute', function(e) {
                        this.seek(1);
                    }, this);

                this.b4.addListener(
                    'execute', function(e) {
                        this.seek(-1);
                    }, this);

                this.b5.addListener(
                    'execute', function(e) {
                        this.seek(-28);
                    }, this);

                this.b6.addListener(
                    'execute', function(e) {
                        this.seek(-365);
                    }, this);

                this.today = new qx.ui.basic.Label();
                this.today.setAlignY('middle');
                this.today.setMinWidth(100);
                this.today.setTextAlign('center');

                navarea.add(this.b1);
                navarea.add(this.b2);
                navarea.add(this.b3);
                navarea.add(this.today);
                navarea.add(this.b4);
                navarea.add(this.b5);
                navarea.add(this.b6);

                this.__window.add(modearea);
                this.__window.add(navarea);

                this.errormsg = new qx.ui.basic.Label();
                this.errormsg.setRich(true);
                this.__window.add(this.errormsg);

                var infoarea = new qx.ui.container.Composite(
                    new qx.ui.layout.HBox(10, 'left'));

                this.list = new qx.ui.form.List();
                this.list.add(new qx.ui.form.ListItem(''));
                this.list.setAllowGrowY(true);

                infoarea.add(this.list);
                infoarea.add(iframe, { flex : 1 });

                this.__window.add(infoarea, { flex : 1 });

                this.weeks = new qx.ui.basic.Label();
                this.weeks.setMarginRight(35);
                this.weeks.setMarginTop(3);

                var logging = new qx.ui.basic.Label('Keep logs: ');
                logging.setMarginTop(4);
                logging.setMarginRight(15);

                manager.addListener('changeSelection', function (e) {
                    var label = (e.getData()[0]).getLabel();
                    this.errormsg.setValue('');
                    this.list.removeAll();
                    this.iframe.setSource('/tools/blank.pl');

                    if (label === 'Search') {
                        this.__window.remove(navarea);
                        this.__window.addAt(searcharea, 1);
                        this.searchInput.focus();
                    } else {
                        this.__window.remove(searcharea);
                        this.__window.addAt(navarea, 1);
                        this.seek(0);
                    }
                }, this);

                var logshort = new qx.ui.form.RadioButton('for last 7 days');
                logshort.setMarginRight(10);
                var loglong = new qx.ui.form.RadioButton(
                    'maximum time (currently forever)');

                var close = new qx.ui.form.Button('Close');
                close.setAlignX('right');

                close.addListener(
                    'execute', function(e) {
                        this.__window.close();
                    }, this);

                close.setMarginLeft(20);

                var logbox = new qx.ui.container.Composite(
                    new qx.ui.layout.HBox());

                logbox.add(this.weeks);
                logbox.add(new qx.ui.core.Spacer(50), { flex : 1 });
                logbox.add(logging);
                logbox.add(logshort);
                logbox.add(loglong);
                logbox.add(close);

                this.__window.add(logbox);

                new qx.ui.form.RadioGroup(logshort, loglong);

                if (this.settings.getLoggingEnabled() === 0) {
                    logshort.setValue(true);
                } else {
                    loglong.setValue(true);
                }

                var settings = this.settings;

                logshort.addListener('click', function(e) {
                    this.__infodialog.showInfoWin(
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

                loglong.addListener('click', function(e) {
                    this.settings.setLoggingEnabled(1);
                }, this);

                this.__window.setModal(true);

                this.seek(0);
                this.mainscreen.desktop.add(this.__window);
            }

            this.__window.center();
            this.updateLogLength();
            this.__window.open();
        },

        __startSearch : function()
        {
            var input = this.searchInput.getValue();
            var doit = true;

            this.errormsg.setValue('');
            this.searchstring = input;
            this.iframe.setSource('/tools/blank.pl');

            if (doit === true) {
                this.__rpclisa.callAsync(
                    qx.lang.Function.bind(this.__searchresult, this),
                    'search', input, this.rpc.id);
            } else {
                this.errormsg.setValue(
                    '<font color=\"#FF0000\">Your search string contains' +
                        ' unsupported special character(s).</font>');
            }
        },

        sendresult : function(result)
        {
            var pos = result.search(/></);
            var date = result.slice(0, pos);
            var data = result.slice(pos+2);

            if (this.__pos === 0) {
                date = 'Today';
            }

            this.today.setValue(date);

            var channels = data.split('><');
            this.list.removeAll();

            if (channels[0] === 'No groups') {
                this.iframe.setSource(
                    '/tools/blank.pl?t=' +
                        escape('Nothing has been logged for this day.'));
            } else {
                for (var i=0; i < channels.length; i = i + 3) {
                    var tmp = new qx.ui.form.ListItem(channels[i]);
                    tmp.chan = escape(channels[i+1]);
                    tmp.date = channels[i+2];
                    tmp.rpc = this.rpc;
                    tmp.tz = this.rpc.timezone;
                    tmp.st = '';
                    tmp.iframe = this.iframe;

                    tmp.addListener('click', function (e) {
                        this.iframe.setSource(
                            '/tools/get_day.pl?id=' +  this.rpc.id + '&sec=' +
                                this.rpc.sec + '&cookie=' + this.rpc.cookie +
                                '&date=' + this.date + '&chan=' + this.chan +
                                '&tz=' + this.tz + '&st=' + this.st);
                    }, tmp);

                    this.list.add(tmp);

                    if (i === 0) {
                        this.list.setSelection([tmp]);
                    }
                }

                //auto load first item
                this.iframe.setSource(
                    '/tools/get_day.pl?id=' +  this.rpc.id + '&sec=' +
                        this.rpc.sec + '&cookie=' + this.rpc.cookie +
                        '&date=' + channels[2] + '&chan=' +
                        escape(channels[1]) + '&tz=' + this.rpc.timezone +
                        '&st=' + escape(''));
            }

            this.b1.setEnabled(true);
            this.b2.setEnabled(true);
            this.b3.setEnabled(true);

            if (this.__pos === 0) {
                this.b4.setEnabled(false);
            } else {
                this.b4.setEnabled(true);
            }

            if (this.__pos < 28) {
                this.b5.setEnabled(false);
            } else {
                this.b5.setEnabled(true);
            }

            if (this.__pos < 365) {
                this.b6.setEnabled(false);
            } else {
                this.b6.setEnabled(true);
            }
        },

        __searchresult : function(result, exc)
        {
            if (exc === null) {
                var hits = result.split('||');
                this.list.removeAll();

                if (result !== '') {
                    var firstitem = hits[0].split('|');

                    for (var i=0; i < hits.length; i = i + 2) {
                        var item = hits[i].split('|');

                        var tmp = new qx.ui.form.ListItem('Hit ' + (i / 2 + 1));
                        tmp.date = item[0];
                        tmp.chan = escape(item[1]);
                        tmp.rpc = this.rpc;
                        tmp.tz = this.rpc.timezone;
                        tmp.st = escape(this.searchstring);
                        tmp.iframe = this.iframe;

                        tmp.addListener('click', function (e) {
                            this.iframe.setSource(
                                '/tools/get_day.pl?id=' +  this.rpc.id +
                                    '&sec=' + this.rpc.sec + '&cookie=' +
                                    this.rpc.cookie + '&date=' + this.date +
                                    '&chan=' + this.chan + '&tz=' + this.tz +
                                    '&showall=yes&st=' + this.st);
                        }, tmp);

                        this.list.add(tmp);

                        if (i === 0) {
                            this.list.setSelection([tmp]);
                        }
                    }

                    //auto load first item
                    this.iframe.setSource(
                        '/tools/get_day.pl?id=' +  this.rpc.id + '&sec=' +
                            this.rpc.sec + '&cookie=' + this.rpc.cookie +
                            '&date=' + firstitem[0] + '&chan=' +
                            escape(firstitem[1]) + '&tz=' + this.rpc.timezone +
                            '&showall=yes&st=' + escape(this.searchstring));
                }
            } else {
                this.errormsg.setValue(
                    '<font color=\"#FF0000\">Connection error. Please try' +
                        ' again.</font>');
            }
        },

        updateLogLength : function()
        {
            var firstDate = new Date('2/1/2010 0:00');
            var now = new Date();
            var numWeeks = (now.getTime() - firstDate.getTime()) /
                    (1000 * 60 * 60 * 24 * 7);
            numWeeks =  Math.round(numWeeks*Math.pow(10,3))/Math.pow(10,3);

            // this.weeks.setValue('The logs contain conversations from the' +
            // ' last ' + numWeeks + ' weeks.');
            this.weeks.setValue('');
        },

        seek : function(days)
        {
            this.__pos = this.__pos + days;

            this.b1.setEnabled(false);
            this.b2.setEnabled(false);
            this.b3.setEnabled(false);
            this.b4.setEnabled(false);
            this.b5.setEnabled(false);
            this.b6.setEnabled(false);

            this.rpc.call('GETLOG', this.__pos);
        }
    }
});
