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

qx.Theme.define("client.theme.Decoration",
{
  extend : qx.theme.simple.Decoration,

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
      //    backgroundImage  : "client/menu-background.png",
      //    backgroundRepeat : "scale",

          //width : 1,
          //color : "#000000", //border color
          //style : "solid"
      }
    },

    "toolbar" :
    {
      decorator : qx.ui.decoration.Background

      //style :
      //{
      //  backgroundImage : "client/toolbar-gradient2.png",
      //  backgroundRepeat : "scale"
      //}
    },

    "toolbar-button-hovered" :
    {
      decorator : qx.ui.decoration.Beveled

      //style :
      //{
      //  outerColor : "#b6b6b6",
      //  innerColor : "#f8f8f8",
      //  backgroundImage : "client/button-c.png",
      //  backgroundRepeat : "scale"
      //}
    },

    "toolbar-button-checked" :
    {
      decorator : qx.ui.decoration.Beveled

      //style :
      //{
      //  outerColor : "#b6b6b6",
      //  innerColor : "#f8f8f8",
      //  backgroundImage : "client/button-checked-c.png",
      //  backgroundRepeat : "scale"
      //}
    },

    "toolbar-part" :
    {
      decorator : qx.ui.decoration.Background

      //style :
      //{
      //  backgroundImage  : "client/toolbar-part.gif",
      //  backgroundRepeat : "repeat-y"
      //}
    },

    "toolbar-css" :
    {
      decorator : qx.ui.decoration.Background

      //style :
      //{
      //  backgroundImage : "client/toolbar-gradient2.png",
      //  backgroundRepeat : "scale"
      //}
    },

    "toolbar-button-hovered-css" :
    {
      decorator : qx.ui.decoration.Beveled

      //style :
      //{
      //  outerColor : "#b6b6b6",
      //  innerColor : "#f8f8f8",
      //  backgroundImage : "client/button-c.png",
      //  backgroundRepeat : "scale"
      //}
    },

    "toolbar-button-checked-css" :
    {
      decorator : qx.ui.decoration.Beveled

      //style :
      //{
      //  outerColor : "#b6b6b6",
      //  innerColor : "#f8f8f8",
      //  backgroundImage : "client/button-checked-c.png",
      //  backgroundRepeat : "scale"
      //}
    },

    "toolbar-part-css" :
    {
      decorator : qx.ui.decoration.Background

      //style :
      //{
      //  backgroundImage  : "client/toolbar-part.gif",
      //  backgroundRepeat : "repeat-y"
      //}
    }
  }
});
