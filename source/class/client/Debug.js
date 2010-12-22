
qx.Class.define("debug",
{
    type : "static"

    members :
    {
        print : function(text)
        {
            var now = new Date();
            this.warn("[" + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + "] " + text);
        }
    }
});
