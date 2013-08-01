
qx.Class.define("client.ListItem",
{
    extend : qx.ui.form.ListItem,

    /*
     *****************************************************************************
     CONSTRUCTOR
     *****************************************************************************
     */

    construct : function(label, icon, model)
    {
        this.base(arguments, label, icon, model);
        this.setRich(true);
    },

    properties :
    {
        nick : { check: "String", apply : "updateLabel", init : ""},
        op : { check : "Boolean", apply : "updateLabel", init : false },
        voice : { check : "Boolean", apply : "updateLabel", init : false },
        online : { check : "Number", apply : "updateLabel", init : 0 }
    },

    /*
     *****************************************************************************
     MEMBERS
     *****************************************************************************
     */

    members :
    {
        updateLabel : function(value)
        {
            var opStart = "";
            var opEnd = "";

            if (this.getOp() == true) {
                opStart = "<b>";
                opEnd = "</b>";
            }

            var voice = "";

            if (this.getVoice() == true && this.getOp() == false) {
                voice = "+";
            }

            //online: 0 = unknown, 1 = online, 2 = offline

            var online = "";

            if (this.getOnline() == 1) {
                online =  " <span title=\"Friend is online\" id=\"green\"> &#9679;</span>";
            } else if (this.getOnline() == 2) {
                online = " <span title=\"Friend is offline\"  id=\"red\"> &#9679;</span>";
            }

            this.setLabel(opStart + voice + this.getNick() + opEnd + online);
        }
    }
});
