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

qx.Class.define('mas.Settings', {
    extend: qx.core.Object,

    construct: function(cbCtx, announceSettingCb) {
        this._cbCtx = cbCtx;
        this._announceSettingCb = announceSettingCb;
    },

    properties : {
        firstTime : {
            init: 1,
            apply: '_announce'
        },
        loggingEnabled: {
            init: 1,
            apply: '_announce'
        },
        sslEnabled: {
            init: 0,
            apply: '_announce'
        },
        largeFonts: {
            init: 1,
            apply: '_announce'
        },
        autoArrange: {
            init: 1,
            apply: '_announce'
        },
        showCloseWarn: {
            init : 1,
            apply: '_announce'
        }
    },

    members: {
        _cbCtx: null,
        _announceSettingCb: null,

        updateFromServer: function(params) {
            for(var key in params) {
                if (params.hasOwnProperty(key)) {
                    var param = {};

                    // All settings are currently numbers
                    param[key] = parseInt(params[key], 10);

                    try {
                        this.set(param);
                    } catch (e) {
                        debug.print(
                            'Unknown setting received from the server: ' +
                                e.message);
                    }
                }
            }
        },

        _announce: function(value, oldValue, name) {
            this._announceSettingCb.call(this._cbCtx, name, value);
        }
    }
});
