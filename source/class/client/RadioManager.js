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

qx.Class.define("client.RadioManager",
{
    extend : qx.ui.form.RadioGroup,

    /*
     *****************************************************************************
     CONSTRUCTOR
     *****************************************************************************
     */

    construct : function(content)
    {
        this.base(arguments);
    },

    /*
     *****************************************************************************
     MEMBERS
     *****************************************************************************
     */

    members :
    {
        _onItemChangeChecked : function(e)
        {
            var item = e.getTarget();

            //alert(item.getValue());

            if (item.getValue()) {
                this.setSelection([item]);
            } else if (this.getSelection()[0] == item) {
                item.setValue(true);
                this.setSelection([item]);
            }
        }
    }
});
