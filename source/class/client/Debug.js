
qx.Class.define("client.Debug",
{
    extend : qx.core.Object,

    construct : function()
    {
	this.base(arguments);
    },

    members :
    {
        print : function(text)
        {
            var now = new Date();
            this.warn("[" + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + "] " + text);
        }
    }
});
