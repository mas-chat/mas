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

qx.Class.define('mas.Dialog', {
    extend: qx.ui.window.Window,

    construct: function() {
        this.base(arguments);

        this.set({
            contentPadding: 13,
            modal: true,
            showClose: false,
            showMinimize: false,
            showMaximize: false
        });

        this.setLayout(new qx.ui.layout.VBox(10));
    },

    properties: {
        text: {
            init: 'Default'
        },
        yesLabel: {
            init: ''
        },
        yesCb: {
            init: null
        },
        noLabel: {
            init: ''
        },
        noCb: {
            init: null
        },
        allowIgnore: {
            init: false
        },
        ignoreCb: {
            init: null
        }
    },

    members: {
        _ignoreCheckBox: null,

        open: function() {
            var text = new qx.ui.basic.Label(this.getText()).set({
                rich: true
            });
            this.add(text);

            var box = new qx.ui.container.Composite();
            box.setLayout(new qx.ui.layout.HBox(10, 'left'));
            box.add(new qx.ui.core.Spacer(30), { flex: 1 });
            this.add(box);

            if (this.getAllowIgnore() === true) {
                this._ignoreCheckBox = new qx.ui.form.CheckBox(
                    'Don\'t show again');
                box.add(this._ignoreCheckBox);
            }

            if (this.getYesLabel() !== '') {
                this._createButton(box, this.getYesLabel(), this.getYesCb());
            }

            if (this.getNoLabel() !== '') {
                this._createButton(box, this.getNoLabel(), this.getNoCb());
            }

            this.center();
            this.base(arguments);
        },

        _createButton: function(box, label, cb) {
            var button = new qx.ui.form.Button(label);
            box.add(button);

            button.addListener('execute', function() {
                if (cb !== null) {
                    cb();
                }

                if (this.getAllowIgnore() === true &&
                    this._ignoreCheckBox.getValue() === true &&
                    this.getIgnoreCb() !== null) {
                    this.getIgnoreCb()();
                }

                this.close();
            }, this);
        }
    }
});
