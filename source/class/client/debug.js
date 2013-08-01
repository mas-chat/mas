
qx.Class.define("client.debug",
{
    type : "static",

    statics :
    {
        print : function(text)
        {
            var now = new Date();

            qx.log.Logger.warn("[" + now.getHours() + ":" + now.getMinutes() +
                               ":" + now.getSeconds() + "] " + text);
        }
    }
});
