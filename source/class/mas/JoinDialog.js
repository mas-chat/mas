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

qx.Class.define('mas.JoinDialog',
{
    extend : qx.core.Object,

    construct : function(srpc, settings)
    {

    },

    members :
    {
        __rpc : 0,

        getJoinNewChannelWin : function(rootItem, mode) {
            this.__window.removeAll();
            this.__box.removeAll();

            this.__window.add(this.__message);

            if (mode === 0) {
                this.__window.setCaption('Join existing group');
                this.__message.setLabel(
                    'Type the name of the group you wish to join:');
            } else {
                this.__window.setCaption('Join IRC channel');
                this.__message.setLabel(
                    'Type the name of the IRC channel you wish to join:');
            }

            this.__input.setValue('');
            this.__window.add(this.__input);

            this.__message3.setLabel('Password, if needed:');
            this.__window.add(this.__message3);

            this.__input2.setValue('');
            this.__window.add(this.__input2);

            this.__window.add(this.__box2);
            this.__window.add(this.__box);

            this.__box.removeAll();
            this.__box2.removeAll();

            this.__box.add(this.__spacer, { flex: 1 });
            this.__yesbutton.setLabel('OK');
            this.__box.add(this.__yesbutton);
            this.__nobutton.setLabel('Cancel');
            this.__box.add(this.__nobutton);

            if (mode === 1) {
                this.__message2.setLabel('Network:');

                this.__combo.removeAll();
                //TODO: configuration system needed, now UPDATE THIS manually!
                this.__combo.add(new qx.ui.form.ListItem('IRCNet'));
                this.__combo.add(new qx.ui.form.ListItem('FreeNode'));
                this.__combo.add(new qx.ui.form.ListItem('W3C'));

                this.__combo.setValue('IRCNet');
                this.__nwselection = 'IRCNet';

                this.__combo.addListener('changeValue', function(e) {
                    this.__nwselection = e.getData();
                }, this);

                this.__box2.add(this.__message2);
                this.__box2.add(this.__combo);
            } else {
                this.__nwselection = 'MeetAndSpeak';
            }

            if (this.__nolistenerid !== 0) {
                this.__nobutton.removeListenerById(this.__nolistenerid);
            }

            this.__nolistenerid = this.__nobutton.addListener(
                'execute', function() {
                    this.__window.close();
                }, this);

            if (this.__yeslistenerid !== 0) {
                this.__yesbutton.removeListenerById(this.__yeslistenerid);
            }

            this.__yeslistenerid = this.__yesbutton.addListener(
                'execute', function() {
                    var input = this.__input.getValue();

                    if (input !== '') {
                        this.__rpc.call('JOIN', input + ' ' + this.__nwselection +
                                      ' ' + this.__input2.getValue());
                    }

                    this.__window.close();
                }, this);

            rootItem.add(this.__window);
            this.__window.open();
            this.__input.focus();
            this.__window.center();
        },

        __process : function() {
            var input = this.__input.getValue();
            var input2 = this.__input2.getValue();

            if (input !== '') {
                this.__rpc.call('CREATE', input + ' ' + input2);
            }
            this.__window.close();
        }
    }
});
