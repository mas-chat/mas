/* ************************************************************************

   Copyright:

   License:

   Authors:

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
              backgroundImage  : "/i/bg.jpg",
              backgroundRepeat : "repeat"
	  }
      },

    "menu2" :
    {
      decorator : qx.ui.decoration.Single,

      style :
      {
          backgroundImage  : "/i/menu-background.png",
	  backgroundRepeat : "scale",

//	  backgroundColor : "#266FB0",

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
        backgroundImage : "/i/toolbar-gradient2.png",
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
        backgroundImage : "/i/button-c.png",
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
        backgroundImage : "/i/button-checked-c.png",
        backgroundRepeat : "scale"
      }
    },

    "toolbar-part" :
    {
      decorator : qx.ui.decoration.Background,

      style :
      {
        backgroundImage  : "/i/toolbar-part.gif",
        backgroundRepeat : "repeat-y"
      }
    }

  }
});
