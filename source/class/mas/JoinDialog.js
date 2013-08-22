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

qx.Class.define('mas.JoinDialog', {
    extend: mas.Dialog,

    construct: function() {
        this.base(arguments);
    },

    properties: {
        mode: {
            init: 'MASGROUP' // 'IRC' or 'MASGROUP'
        },
        joinCb: {
            init: null
        }
    },

    members: {
        open: function() {
            var caption = 'Join existing group';
            var text = 'Type the name of the group you wish to join:';

            if (this.getMode() !== 'MASGROUP') {
                caption = 'Join IRC channel';
                text = 'Type the name of the IRC channel you wish to join:';
            }

            var that = this;

            // Configure the base object
            this.set({
                caption: caption,
                text: text,
                yesLabel: 'OK',
                yesCb: function() {
                    var name = nameField.getValue();
                    var selectedNw = that.getMode() === 'MASGROUP' ?
                            'MeetAndSpeak' : comboBox.getValue();

                    if (name !== '') {
                        that.getJoinCb()(name, pwField.getValue(), selectedNw);
                    }
                },
                noLabel: 'Cancel'
            });

            this.base(arguments);

            // Add more fields
            var fieldProperties = { maxLength: 25 };
            var comboBox = new qx.ui.form.ComboBox();
            var nameField = new qx.ui.form.TextField().set(fieldProperties);
            var pwField = new qx.ui.form.TextField().set(fieldProperties);

            this.addAt(nameField, 1);
            this.addAt(new qx.ui.basic.Label('Password, if needed:'), 2);
            this.addAt(pwField, 3);

            if (this.getMode() === 'IRC') {
                // TODO: configuration system needed, now UPDATE THIS manually!
                comboBox.add(new qx.ui.form.ListItem('IRCNet'));
                comboBox.add(new qx.ui.form.ListItem('FreeNode'));
                comboBox.add(new qx.ui.form.ListItem('W3C'));
                comboBox.setValue('IRCNet');

                var composite = new qx.ui.container.Composite();
                composite.setLayout(new qx.ui.layout.HBox(10, 'left'));
                composite.add(new qx.ui.basic.Label('Network:'));
                composite.add(comboBox);

                this.addAt(composite, 4);
            }
        }
    }
});
