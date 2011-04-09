/* ************************************************************************

   Copyright:

   License:

   Authors:

#asset(client/*)

************************************************************************ */

qx.Theme.define("client.theme.Decoration",
{
  extend : aie.theme.mtsk.Decoration,
  
  decorations :
  {
      "background2" :
      {
	  decorator : qx.ui.decoration.Background,
 
	  style :
	  {
              backgroundImage  : "client/bg.jpg",
              backgroundRepeat : "repeat"
	  }
      },

    "menu2" :
    {
      decorator : qx.ui.decoration.Single,

      style :
      {
          backgroundImage  : "client/menu-background.png",
	  backgroundRepeat : "scale",

          width : 1,
          color : "border-main",
          style : "solid"
      }
    },

    "toolbar" :
    {
      decorator : qx.ui.decoration.Background,

      style :
      {
        backgroundImage : "client/toolbar-gradient2.png",
        backgroundRepeat : "scale"
      }
    },

    "toolbar-button-hovered" :
    {
      decorator : qx.ui.decoration.Beveled,

      style :
      {
        outerColor : "#b6b6b6",
        innerColor : "#f8f8f8",
        backgroundImage : "client/button-c.png",
        backgroundRepeat : "scale"
      }
    },

    "toolbar-button-checked" :
    {
      decorator : qx.ui.decoration.Beveled,

      style :
      {
        outerColor : "#b6b6b6",
        innerColor : "#f8f8f8",
        backgroundImage : "client/button-checked-c.png",
        backgroundRepeat : "scale"
      }
    },

    "toolbar-part" :
    {
      decorator : qx.ui.decoration.Background,

      style :
      {
        backgroundImage  : "client/toolbar-part.gif",
        backgroundRepeat : "repeat-y"
      }
    },

    "toolbar-css" :
    {
      decorator : qx.ui.decoration.Background,

      style :
      {
        backgroundImage : "client/toolbar-gradient2.png",
        backgroundRepeat : "scale"
      }
    },

    "toolbar-button-hovered-css" :
    {
      decorator : qx.ui.decoration.Beveled,

      style :
      {
        outerColor : "#b6b6b6",
        innerColor : "#f8f8f8",
        backgroundImage : "client/button-c.png",
        backgroundRepeat : "scale"
      }
    },

    "toolbar-button-checked-css" :
    {
      decorator : qx.ui.decoration.Beveled,

      style :
      {
        outerColor : "#b6b6b6",
        innerColor : "#f8f8f8",
        backgroundImage : "client/button-checked-c.png",
        backgroundRepeat : "scale"
      }
    },

    "toolbar-part-css" :
    {
      decorator : qx.ui.decoration.Background,

      style :
      {
        backgroundImage  : "client/toolbar-part.gif",
        backgroundRepeat : "repeat-y"
      }
    }
  }
});
