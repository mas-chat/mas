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

qx.Class.define('mas.Settings',
{
    extend : qx.core.Object,

    construct : function(srpc, params)
    {
        this.rpc = srpc;
        this.update(params);
    },

    //TODO: write proper destructor

    properties :
    {
        firstTime : { init : 1, apply : '_applyFirstTime' },
        loggingEnabled : { init : 1, apply : '_applyLoggingEnabled' },
        sslEnabled : { init : 0, apply : '_applySslEnabled' },
        largeFonts : { init : 1, apply : '_applyLargeFonts' },
        autoArrange : { init : 1, apply : '_applyAutoArrange' },
        showCloseWarn : { init : 1, apply : '_applyShowCloseWarn' }
    },

    members :
    {
        rpc : 0,
        _initDone : false,

        update : function(params)
        {
            for(var key in params) {
                var value = params[key];

                switch(key) {
                case 'firstTime':
                    this.setFirstTime(parseInt(value, 10));
                    break;

                case 'autoArrange':
                    this.setAutoArrange(parseInt(value, 10));
                    break;

                case 'largeFonts':
                    this.setLargeFonts(parseInt(value, 10));
                    break;

                case 'loggingEnabled':
                    this.setLoggingEnabled(parseInt(value, 10));
                    break;

                case 'sslEnabled':
                    this.setSslEnabled(parseInt(value, 10));
                    break;

                case 'showCloseWarn':
                    this.setShowCloseWarn(parseInt(value, 10));
                    break;
                }
            }

            this._initDone = true;
        },

        _applyShowCloseWarn : function(value)
        {
            this.send('showCloseWarn', value);
        },

        _applyFirstTime : function(value)
        {
            this.send('firstTime', value);
        },

        _applyLoggingEnabled : function(value)
        {
            this.send('loggingEnabled', value);
        },

        _applySslEnabled : function(value)
        {
            this.send('sslEnabled', value);
        },

        _applyLargeFonts : function(value)
        {
            this.send('largeFonts', value);
        },

        _applyAutoArrange : function(value)
        {
            this.send('autoArrange', value);
        },

        send : function(name, value)
        {
            if (this._initDone === true) {
                this.rpc.call('SET', name + ' ' + value);
            }
        }
    }
});
