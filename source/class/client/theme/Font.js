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
	    size : (qx.bom.client.System.WINVISTA || qx.bom.client.System.WIN7) ? 14 : 13,
	    lineHeight : 1.4,
	    family : qx.bom.client.Platform.MAC ? [ "Lucida Grande" ] :
		(qx.bom.client.System.WINVISTA || qx.bom.client.System.WIN7) ?
		[ "Segoe UI", "Candara" ] :
		[ "Tahoma", "Liberation Sans", "Arial", "sans-serif" ]
	}
    }
});
