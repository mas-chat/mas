/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */

qx.Theme.define("client.theme.Decoration",
{
  extend : qx.theme.modern.Decoration,

  decorations :
  {
      "background2" :
      {
	  decorator : qx.ui.decoration.Background,
 
	  style :
	  {
              backgroundImage  : "/img/bg.jpg",
              backgroundRepeat : "scale"
	  }
      }
  }
});
