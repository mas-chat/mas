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

// Can't use strict because of Qooxdoo
// 'use strict';

qx.Class.define('mas.ListItem', {
    extend: qx.ui.form.ListItem,

    construct: function(label, icon, model) {
        this.base(arguments);
        this.setRich(true);
    },

    properties: {
        nick: {
            check: 'String',
            apply: 'updateLabel',
            init: ''
        },
        op: {
            check: 'Boolean',
            apply: 'updateLabel',
            init: false
        },
        voice: {
            check: 'Boolean',
            apply: 'updateLabel',
            init: false
        },
        online: {
            check: 'Number',
            apply: 'updateLabel',
            init: 0
        }
    },

    members: {
        updateLabel: function() {
            var opStart = '';
            var opEnd = '';

            if (this.getOp() === true) {
                opStart = '<b>';
                opEnd = '</b>';
            }

            var voice = '';

            if (this.getVoice() === true && this.getOp() === false) {
                voice = '+';
            }

            //online: 0 = unknown, 1 = online, 2 = offline

            var online = '';

            if (this.getOnline() === 1) {
                online =  ' <span title="Friend is online" id="green"> ' +
                    '&#9679;</span>';
            } else if (this.getOnline() === 2) {
                online = ' <span title="Friend is offline"  id="red"> ' +
                    '&#9679;</span>';
            }

            this.setLabel(opStart + voice + this.getNick() + opEnd + online);
        }
    }
});
