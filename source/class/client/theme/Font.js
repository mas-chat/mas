/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */

qx.Theme.define("client.theme.Font",
{
    extend : aie.theme.mtsk.Font,

    fonts :
    {
	"defaultlarge" :
	{
	    size : ((qx.core.Environment.get("os.name") === "win" && qx.core.Environment.get("os.version") === "vista") || (qx.core.Environment.get("os.name") === "win" && qx.core.Environment.get("os.version") === "7")) ? 13 : 13,
	    lineHeight : 1.4,
	    family : (qx.core.Environment.get("os.name") === "osx") ? [ "Lucida Grande" ] :
		((qx.core.Environment.get("os.name") === "win" && qx.core.Environment.get("os.version") === "vista") || (qx.core.Environment.get("os.name") === "win" && qx.core.Environment.get("os.version") === "7")) ?
		[ "Segoe UI", "Candara" ] :
		[ "Arial", "Liberation Sans", "Tahoma",  "sans-serif" ]
	}
    }
});
